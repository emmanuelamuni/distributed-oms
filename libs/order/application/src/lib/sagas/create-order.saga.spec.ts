import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';

import { CreateOrderSaga } from './create-order.saga';
import { ConfirmOrderCommand } from '../commands/confirm-order.command';
import { CancelOrderCommand } from '../commands/cancel-order.command';
import { INVENTORY_COMMAND_PUBLISHER, IInventoryCommandPublisher } from '@doms/order/domain';

const mockCommandBus = {
    execute: jest.fn(),
} as unknown as jest.Mocked<CommandBus>;

const mockInventoryCommandPublisher: jest.Mocked<IInventoryCommandPublisher> = {
    publish: jest.fn(),
};

const orderPayload = {
    orderId: 'e3a3eb39-1eeb-4f7f-90f2-f4c4bcb61c6e',
    correlationId: '1714e15b-cfad-48b9-adbb-b2973a1f682f',
};
export interface OrderCreatedEventPayload {
    orderId: string;
    lines: Array<{
        sku: string;
        quantity: number;
    }>;
    createdAt: string;
    correlationId: string;
}

describe('CreateOrderSaga', () => {
    let saga: CreateOrderSaga;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateOrderSaga,
                { provide: CommandBus, useValue: mockCommandBus },
                { provide: INVENTORY_COMMAND_PUBLISHER, useValue: mockInventoryCommandPublisher },
            ],
        }).compile();

        saga = module.get<CreateOrderSaga>(CreateOrderSaga);
    });

    afterEach(() => jest.clearAllMocks());

    describe('onOrderCreated', () => {
        it('should publish ReserveInventory command with correct payload', async () => {
            await saga.onOrderCreated({
                orderId: orderPayload.orderId,
                lines: [{ sku: 'WIDGET-1234', quantity: 2 }],
                createdAt: '2026-05-04',
                correlationId: orderPayload.correlationId,
            });

            expect(mockInventoryCommandPublisher.publish).toHaveBeenCalledWith({
                orderId: orderPayload.orderId,
                correlationId: orderPayload.correlationId,
                lines: [{ sku: 'WIDGET-1234', quantity: 2 }],
            });
        });
    });

    describe('onInventoryReservationSucceeded', () => {
        it('should dispatch ConfirmOrderCommand', async () => {
            await saga.onInventoryReservationSucceeded({
                reservationId: '27dcf9f3-ecae-4823-946c-a2c3678a4e13',
                orderId: orderPayload.orderId,
                lines: [
                    {
                        sku: 'WIDGET-1234',
                        quantity: 2,
                        nodeId: 'bc8f88f6-9747-4c4f-904c-579a9fe4a67f',
                    },
                ],
                reservedAt: '2026-05-04',
                correlationId: orderPayload.correlationId,
            });

            expect(mockCommandBus.execute).toHaveBeenCalledWith(expect.any(ConfirmOrderCommand));

            const dispatchedCommand = mockCommandBus.execute.mock
                .calls[0][0] as ConfirmOrderCommand;

            expect(dispatchedCommand.orderId).toBe(orderPayload.orderId);
            expect(dispatchedCommand.correlationId).toBe(orderPayload.correlationId);
        });
    });

    describe('onInventoryReservationFailed', () => {
        it('should dispatch CancelOrderCommand using the provided reason', async () => {
            await saga.onInventoryReservationFailed({
                orderId: orderPayload.orderId,
                reason: 'INSUFFICIENT_STOCK',
                failedAt: '2026-05-04',
                correlationId: orderPayload.correlationId,
            });

            const dispatchedCommand = mockCommandBus.execute.mock.calls[0][0] as CancelOrderCommand;
            expect(dispatchedCommand.reason).toBe('INSUFFICIENT_STOCK');
        });

        it('should default reason to INVENTORY_UNAVAILABLE when not provided', async () => {
            await saga.onInventoryReservationFailed({
                orderId: orderPayload.orderId,
                failedAt: '2026-05-04',
                correlationId: orderPayload.correlationId,
            });

            const dispatchedCommand = mockCommandBus.execute.mock.calls[0][0] as CancelOrderCommand;
            expect(dispatchedCommand.reason).toBe('INVENTORY_UNAVAILABLE');
        });
    });
});
