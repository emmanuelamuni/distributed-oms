import { DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ORDER_REPOSITORY, IOrderRepository } from '@doms/order/domain';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import { CancelOrderCommand } from './cancel-order.command';
import { CancelOrderHandler } from './cancel-order.handler';
import { OrderStatusEnum, Order, OrderNotFoundException } from '@doms/order/domain';
import { Test, TestingModule } from '@nestjs/testing';

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

const mockOrder = {
    id: 'e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e',
    customerId: 'b4428981-5678-4986-93ed-685000708ea4',
    channel: 'web',
    status: { value: OrderStatusEnum.CANCELLED },
    totalAmount: { amount: 2000, currency: 'USD' },
    shippingAddress: {
        street: '14 Old Town Street',
        city: 'Ajah',
        state: 'Lagos',
        postcode: '100101',
        country: 'NG',
    },
    createdAt: new Date('2026-05-04'),
    updatedAt: new Date('2026-05-04'),
    lines: [
        {
            sku: 'WIDGET-1234',
            quantity: 2,
            unitPrice: { amount: 1000, currency: 'USD' },
            lineTotal: () => ({ amount: 2000, currency: 'USD' }),
        },
    ],
    cancel: jest.fn(),
    pullDomainEvents: jest
        .fn()
        .mockReturnValue([
            {
                aggregateId: 'e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e',
                eventType: 'OrderCancelledEvent',
            },
        ]),
};

const validCommand = new CancelOrderCommand(
    mockOrder.id,
    'INVENTORY_UNAVAILABLE',
    '577ef032-2b25-4182-af81-9882955d0c4e',
);

// Tests
describe('CancelOrderHandler', () => {
    let handler: CancelOrderHandler;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CancelOrderHandler,
                { provide: DataSource, useValue: mockDataSource },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
                { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
                { provide: IDEMPOTENCY_STORE, useValue: mockIdempotencyStore },
            ],
        }).compile();

        handler = module.get(CancelOrderHandler);
    });

    afterEach(() => jest.clearAllMocks());

    describe('Idempotency', () => {
        it('should return cache if correlationId is already processed', async () => {
            const cachedResponse = { orderId: mockOrder.id, status: OrderStatusEnum.CANCELLED };
            mockIdempotencyStore.get.mockResolvedValueOnce(cachedResponse);

            const result = await handler.execute(validCommand);

            expect(result).toBe(cachedResponse);
            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
            expect(mockOrderRepository.findById).not.toHaveBeenCalled();
        });
    });

    describe('Happy paths', () => {
        beforeEach(() => {
            mockIdempotencyStore.get.mockResolvedValue(null);
            mockOrderRepository.findById.mockResolvedValue(mockOrder as unknown as Order);
            mockOrderRepository.save.mockResolvedValue();
            mockOutboxRepository.save.mockResolvedValue();
            mockIdempotencyStore.set.mockResolvedValue();
        });

        it('should load order, cancel, save, and write outbox atomically', async () => {
            await handler.execute(validCommand);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(
                mockOrder.id,
                mockQueryRunner,
            );
            expect(mockOrder.cancel).toHaveBeenCalledWith('INVENTORY_UNAVAILABLE');
            expect(mockOrderRepository.save).toHaveBeenCalledWith(mockOrder, mockQueryRunner);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(mockOutboxRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'OrderCancelledEvent',
                    status: OutboxStatus.PENDING,
                }),
                mockQueryRunner,
            );
        });

        it('should return response with CANCELLED status and reason', async () => {
            const result = await handler.execute(validCommand);

            expect(result.orderId).toBe(mockOrder.id);
            expect(result.status).toBe(OrderStatusEnum.CANCELLED);
            expect(result.correlationId).toBe(validCommand.correlationId);
        });

        it('should cache the response after successful cancellation', async () => {
            const result = await handler.execute(validCommand);

            expect(mockIdempotencyStore.set).toHaveBeenCalledWith(
                `${validCommand.correlationId}:cancel-order`,
                result,
                86400,
            );
        });

        it('should release query runner after successful transaction', async () => {
            await handler.execute(validCommand);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('Failure path', () => {
        beforeEach(() => {
            mockIdempotencyStore.get.mockResolvedValue(null);
        });

        it('should throw OrderNotFoundException if order does not exist', async () => {
            mockOrderRepository.findById.mockResolvedValueOnce(null);

            await expect(handler.execute(validCommand)).rejects.toThrow(OrderNotFoundException);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });

        it('should rollback and throw if repository save fails', async () => {
            mockOrderRepository.findById.mockResolvedValue(mockOrder as unknown as Order);
            mockOrderRepository.save.mockRejectedValueOnce(new Error('DB error'));

            await expect(handler.execute(validCommand)).rejects.toThrow('DB error');

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });

        it('should throw InvalidOrderTransitionException if order is already cancelled', async () => {
            const alreadyCancelledOrder = {
                ...mockOrder,
                status: { value: OrderStatusEnum.CANCELLED },
                cancel: jest.fn().mockImplementation(() => {
                    throw new Error('InvalidOrderTransitionException');
                }),
                pullDomainEvents: jest.fn().mockReturnValue([]),
            };

            mockOrderRepository.findById.mockResolvedValue(
                alreadyCancelledOrder as unknown as Order,
            );

            await expect(handler.execute(validCommand)).rejects.toThrow();

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockIdempotencyStore.set).not.toHaveBeenCalled();
        });
    });
});
