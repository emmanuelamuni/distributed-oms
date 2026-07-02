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
import { ReserveInventoryHandler } from './reserve-inventory.handler';
import { ReserveInventoryCommand } from './reserve-inventory.command';

const validCommand = new ReserveInventoryCommand(
    '8c451a1e-dfa6-4c25-98e5-9208a3f713ee',
    [{ sku: 'WIDGET-1234', quantity: 3, nodeId: 'node-001' }],
    '62d73b0e-40e0-4dbf-9aa8-0b23f5825c75',
);

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
const mockOutboxRepository = {
    save: jest.fn(),
    findPending: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
};
const mockInventoryRepository = { findBySkuAndNode: jest.fn(), save: jest.fn() };

const makeNode = () => ({
    reserve: jest.fn(),
    pullDomainEvents: jest.fn().mockReturnValue([]),
    releaseReservation: jest.fn(),
});

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
            expect(mockInventoryRepository.findBySkuAndNode).not.toHaveBeenCalled();
        });
    });

    describe('Locking', () => {
        it('should attempt to acquire lock per line', async () => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockInventoryLock.acquire.mockResolvedValue(false);
            mockOutboxRepository.save.mockResolvedValue(undefined);

            await handler.execute(validCommand);

            expect(mockInventoryLock.acquire).toHaveBeenCalledWith(
                'inventory-lock:WIDGET-1234:node-001',
                5000,
            );
        });

        it('should write failure outbox when lock cannot be acquired', async () => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockInventoryLock.acquire.mockResolvedValue(false);
            mockOutboxRepository.save.mockResolvedValue(undefined);

            await handler.execute(validCommand);

            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'inventory.reservation.failed' }),
                expect.anything(),
            );
        });

        it('should release all acquired locks in finally block', async () => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(makeNode());
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
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(makeNode());
            mockInventoryRepository.save.mockResolvedValue(undefined);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            mockIdempotencyStore.set.mockResolvedValue(undefined);
        });

        it('should call reserve on inventory node with correct args', async () => {
            const node = makeNode();
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(node);

            await handler.execute(validCommand);

            expect(node.reserve).toHaveBeenCalledWith(
                validCommand.correlationId,
                validCommand.orderId,
                expect.anything(),
            );
        });

        it('should write one success outbox record covering all lines', async () => {
            await handler.execute(validCommand);

            expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'inventory.reservation.succeeded',
                    status: OutboxStatus.PENDING,
                }),
                mockQueryRunner,
            );
        });

        it('should commit transaction on success', async () => {
            await handler.execute(validCommand);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        });

        it('should set idempotency key after commit', async () => {
            await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).toHaveBeenCalledWith(
                `${validCommand.correlationId}:reserve-inventory`,
                { success: true },
                86400,
            );
        });

        it('should release queryRunner in finally block', async () => {
            await handler.execute(validCommand);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('Failure paths', () => {
        beforeEach(() => {
            mockIdempotencyStore.has.mockResolvedValue(false);
            mockInventoryLock.acquire.mockResolvedValue(true);
            mockOutboxRepository.save.mockResolvedValue(undefined);
            (mockQueryRunner as any).isTransactionActive = true;
        });

        it('should rollback and write failure outbox on InsufficientInventoryException', async () => {
            const node = makeNode();
            node.reserve.mockImplementation(() => {
                throw new InsufficientInventoryException('WIDGET-1234', 'node-001', 3, 1);
            });
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(node);

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
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(node);

            await handler.execute(validCommand);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'inventory.reservation.failed' }),
                expect.anything(),
            );
        });

        it('should write failure outbox without reason on unexpected error', async () => {
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(null);
            await handler.execute(validCommand);

            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ eventType: 'inventory.reservation.failed' }),
                expect.anything(),
            );
        });

        it('should not set idempotency key on failure', async () => {
            mockInventoryRepository.findBySkuAndNode.mockResolvedValue(null);
            await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });
    });
});
