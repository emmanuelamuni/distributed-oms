import { DataSource, QueryRunner } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CreateOrderCommand } from './create-order.command';
import { CreateOrderHandler } from './create-order.handler';
import { ORDER_REPOSITORY, IOrderRepository, OrderStatusEnum } from '@doms/order/domain';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import { OrderResponseDto } from '../dtos/order-response.dto';

const validCommand = new CreateOrderCommand(
    '58a4a2f6-c427-45bb-a1d5-4a298d924f8e',
    'web',
    {
        street: '14 Old Town Street',
        city: 'Ajah',
        state: 'Lagos',
        postcode: '100101',
        country: 'NG',
    },
    [
        {
            sku: 'WIDGET-1234',
            quantity: 2,
            unitPrice: 1000,
            currency: 'USD',
        },
    ],
    '1714e15b-cfad-48b9-adbb-b2973a1f682f',
);

// Mocks
const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    isReleased: false,
    manager: {},
} as unknown as QueryRunner;

const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource;

const mockConfigService = {
    get: jest.fn().mockReturnValue(86400),
} as unknown as ConfigService;

const mockOrderRepository: jest.Mocked<IOrderRepository> = {
    save: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
};

const mockOutboxRepository: jest.Mocked<IOutboxRepositoryPort> = {
    save: jest.fn(),
    findPending: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
};

const mockIdempotencyStore: jest.Mocked<IIdempotencyStorePort> = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
};

// Tests
describe('CreateOrderHandler', () => {
    let handler: CreateOrderHandler;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateOrderHandler,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: IDEMPOTENCY_STORE, useValue: mockIdempotencyStore },
                { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
                { provide: DataSource, useValue: mockDataSource },
                { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
            ],
        }).compile();

        handler = module.get(CreateOrderHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Idempotency', () => {
        it('should return cached response if correlationId already handled', async () => {
            const cachedResponse: OrderResponseDto = {
                orderId: 'cached-order-uuid',
                status: OrderStatusEnum.DRAFT,
                customerId: validCommand.customerId,
                channel: validCommand.channel,
                totalAmount: 2000,
                currency: validCommand.lines[0].currency,
                shippingAddress: validCommand.shippingAddress,
                lines: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                correlationId: validCommand.correlationId,
            };

            mockIdempotencyStore.get.mockResolvedValueOnce(cachedResponse);

            const result = await handler.execute(validCommand);

            expect(result).toBe(cachedResponse);
            expect(mockIdempotencyStore.get).toHaveBeenCalled();
            expect(mockOrderRepository.save).not.toHaveBeenCalled();
            expect(mockOutboxRepository.save).not.toHaveBeenCalled();
            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
        });
    });

    describe('Happy paths', () => {
        beforeEach(() => {
            mockIdempotencyStore.get.mockResolvedValue(null);
            mockOrderRepository.save.mockResolvedValue();
            mockOutboxRepository.save.mockResolvedValue();
            mockIdempotencyStore.set.mockResolvedValue();
        });

        it('should atomically create order, save, and write to outbox', async () => {
            await handler.execute(validCommand);

            expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
            expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'order.created',
                    status: OutboxStatus.PENDING,
                }),
                mockQueryRunner,
            );
        });

        it('should return accurate order data and status', async () => {
            const result = await handler.execute(validCommand);

            expect(result.customerId).toBe(validCommand.customerId);
            expect(result.correlationId).toBe(validCommand.correlationId);
            expect(result.channel).toBe(validCommand.channel);
            expect(result.status).toBe(OrderStatusEnum.DRAFT);
            expect(result.totalAmount).toBe(2000);
            expect(result.currency).toBe(validCommand.lines[0].currency);
            expect(result.lines).toHaveLength(1);
            expect(result.lines[0].sku).toBe(validCommand.lines[0].sku);
            expect(result.lines[0].quantity).toBe(2);
            expect(result.lines[0].lineTotal).toBe(2000);
        });

        it('should cache response after successful creation', async () => {
            const result = await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).toHaveBeenCalledTimes(1);
            expect(mockIdempotencyStore.set).toHaveBeenCalledWith(
                `${validCommand.correlationId}:create-order`,
                result,
                86400,
            );
        });

        it('should release QueryRunner after transaction', async () => {
            await handler.execute(validCommand);

            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('Failure paths', () => {
        beforeEach(() => {
            mockIdempotencyStore.get.mockResolvedValue(null);
        });

        it('should rollback transactions and throw if repo save fails', async () => {
            const err = new Error('DB connection error');
            mockOrderRepository.save.mockRejectedValueOnce(err);

            await expect(handler.execute(validCommand)).rejects.toThrow('DB connection error');

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
            expect(mockOutboxRepository.save).not.toHaveBeenCalled();
            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });

        it('should rollback and throw if outbox write fails', async () => {
            const err = new Error('Outbox write fails');
            mockOutboxRepository.save.mockRejectedValueOnce(err);

            await expect(handler.execute(validCommand)).rejects.toThrow('Outbox write fails');

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });

        it('should throw if lines are empty', async () => {
            const invalidCommand = new CreateOrderCommand(
                validCommand.customerId,
                validCommand.channel,
                validCommand.shippingAddress,
                [],
                validCommand.correlationId,
            );

            await expect(handler.execute(invalidCommand)).rejects.toThrow();

            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
            expect(mockOrderRepository.save).not.toHaveBeenCalled();
        });

        it('should throw if lines have mixed currencies', async () => {
            const invalidCommand = new CreateOrderCommand(
                validCommand.customerId,
                validCommand.channel,
                validCommand.shippingAddress,
                [
                    { ...validCommand.lines[0], currency: 'GBP' },
                    { ...validCommand.lines[0], sku: 'GADGET-1234', currency: 'USD' },
                ],
                validCommand.correlationId,
            );

            await expect(handler.execute(invalidCommand)).rejects.toThrow();

            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
            expect(mockOrderRepository.save).not.toHaveBeenCalled();
        });
    });
});
