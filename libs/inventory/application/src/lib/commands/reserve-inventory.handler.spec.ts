import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
    INVENTORY_REPOSITORY,
    INVENTORY_LOCK,
    InsufficientInventoryException,
    ReservationAlreadyExistsException,
} from '@doms/inventory/domain';
import { OUTBOX_REPOSITORY, OutboxStatus } from '@doms/shared/outbox';
import { IDEMPOTENCY_STORE } from '@doms/shared/idempotency';
import { GetAvailabilityService } from '../services/get-availability.service';
import { ReserveInventoryHandler } from './reserve-inventory.handler';
import { ReserveInventoryCommand } from './reserve-inventory.command';

const validCommand = new ReserveInventoryCommand({
    orderId: '62d73b0e-40e0-4dbf-9aa8-0b23f5825c75',
    correlationId: '8c451a1e-dfa6-4c25-98e5-9208a3f713ee',
    lines: [{ sku: 'WIDGET-1234', quantity: 3 }],
});

const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: false,
    isReleased: false,
} as unknown as QueryRunner;

const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource;

const mockConfigService = {
    get: jest.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
} as unknown as ConfigService;

const mockInventoryLock = { acquire: jest.fn(), release: jest.fn() };
const mockIdempotencyStore = { has: jest.fn(), set: jest.fn(), get: jest.fn() };
const mockOutboxRepository = { save: jest.fn() };
const mockInventoryRepository = { findBySkusAndNodes: jest.fn(), save: jest.fn() };
const mockAvailabilityService = { execute: jest.fn() };

const makeNode = () => ({
    sku: 'WIDGET-1234',
    nodeId: 'node-001',
    reserve: jest.fn(),
    pullDomainEvents: jest.fn().mockReturnValue([]),
});

const defaultAvailabilityResponse = [
    {
        sku: 'WIDGET-1234',
        totalAvailable: 10,
        nodes: [{ nodeId: 'node-001', available: 10 }],
    },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('ReserveInventoryHandler', () => {
    let handler: ReserveInventoryHandler;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReserveInventoryHandler,
                { provide: INVENTORY_LOCK, useValue: mockInventoryLock },
                { provide: IDEMPOTENCY_STORE, useValue: mockIdempotencyStore },
                { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
                { provide: INVENTORY_REPOSITORY, useValue: mockInventoryRepository },
                { provide: GetAvailabilityService, useValue: mockAvailabilityService },
                { provide: DataSource, useValue: mockDataSource },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        handler = module.get(ReserveInventoryHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
        (mockQueryRunner as any).isTransactionActive = false;
        (mockQueryRunner as any).isReleased = false;
    });

    describe('Idempotency', () => {
        it('should return early if already processed', async () => {
            mockIdempotencyStore.has.mockResolvedValue(true);

            await handler.execute(validCommand);

            expect(mockInventoryLock.acquire).not.toHaveBeenCalled();
            expect(mockAvailabilityService.execute).not.toHaveBeenCalled();
        });
    });

    describe('Locking & Availability', () => {
        it('should attempt to acquire distributed lock using resolved node ID', async () => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockAvailabilityService.execute.mockResolvedValue(defaultAvailabilityResponse);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([makeNode()]);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            mockIdempotencyStore.set.mockResolvedValue(undefined);

            await handler.execute(validCommand);

            expect(mockInventoryLock.acquire).toHaveBeenCalledWith(
                'inventory-lock:WIDGET-1234:node-001',
                5000,
            );
        });

        it('should release all acquired locks in finally block', async () => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockAvailabilityService.execute.mockResolvedValue(defaultAvailabilityResponse);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([makeNode()]);
            mockInventoryRepository.save.mockResolvedValue(undefined);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            mockIdempotencyStore.set.mockResolvedValue(undefined);

            await handler.execute(validCommand);

            expect(mockInventoryLock.release).toHaveBeenCalledWith(
                'inventory-lock:WIDGET-1234:node-001',
            );
        });
    });

    describe('Happy path', () => {
        beforeEach(() => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockAvailabilityService.execute.mockResolvedValue(defaultAvailabilityResponse);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([makeNode()]);
            mockInventoryRepository.save.mockResolvedValue(undefined);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            mockIdempotencyStore.set.mockResolvedValue(undefined);
        });

        it('should call reserve on inventory node with correct arguments', async () => {
            const node = makeNode();
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);

            await handler.execute(validCommand);

            expect(node.reserve).toHaveBeenCalledWith(
                validCommand.payload.correlationId,
                validCommand.payload.orderId,
                expect.objectContaining({ value: 3 }),
            );
        });

        it('should write success outbox record and commit transaction', async () => {
            await handler.execute(validCommand);

            expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'inventory.reservation.succeeded',
                    status: OutboxStatus.PENDING,
                }),
                mockQueryRunner,
            );
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        });

        it('should set idempotency key after successful transaction commit', async () => {
            await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).toHaveBeenCalledWith(
                `${validCommand.payload.correlationId}:reserve-inventory`,
                { success: true },
                86400,
            );
        });
    });

    describe('Failure paths', () => {
        beforeEach(() => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockAvailabilityService.execute.mockResolvedValue(defaultAvailabilityResponse);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            (mockQueryRunner as any).isTransactionActive = true;
        });

        it('should rollback and write failure outbox on InsufficientInventoryException', async () => {
            const node = makeNode();
            node.reserve.mockImplementation(() => {
                throw new InsufficientInventoryException('WIDGET-1234', 'node-001', 3, 1);
            });
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);

            await handler.execute(validCommand);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'inventory.reservation.failed' }),
                expect.anything(),
            );
        });

        it('should rollback and write failure outbox on ReservationAlreadyExistsException', async () => {
            const node = makeNode();
            node.reserve.mockImplementation(() => {
                throw new ReservationAlreadyExistsException('corr-abc');
            });
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([node]);

            await handler.execute(validCommand);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'inventory.reservation.failed' }),
                expect.anything(),
            );
        });

        it('should not set idempotency key on failure', async () => {
            mockInventoryRepository.findBySkusAndNodes.mockResolvedValue([]);

            await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });
    });
});
