import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { INVENTORY_COMMAND_PUBLISHER, IInventoryCommandPublisher } from '@doms/order/domain';
import {
    OrderCreatedEventPayload,
    InventoryReservedEventPayload,
    InventoryReservationFailedEventPayload,
} from '@doms/shared/events';
import { ConfirmOrderCommand } from '../commands/confirm-order.command';
import { CancelOrderCommand } from '../commands/cancel-order.command';

@Injectable()
export class CreateOrderSaga {
    private readonly logger = new Logger(CreateOrderSaga.name);

    constructor(
        @Inject(CommandBus) private readonly commandBus: CommandBus,
        @Inject(INVENTORY_COMMAND_PUBLISHER)
        private readonly invComPublisher: IInventoryCommandPublisher,
    ) {}

    /** Dispatches a ReserveInventoryCommand to the inventory service via Kafka */
    async onOrderCreated(payload: OrderCreatedEventPayload): Promise<void> {
        this.logger.log(
            `Created for (${payload.orderId}). CorrelationId: ${payload.correlationId}`,
        );

        await this.invComPublisher.publish({
            orderId: payload.orderId,
            correlationId: payload.correlationId,
            lines: payload.lines,
        });
    }

    /** Confirm order on inventory.reservation.succeeded received */
    async onInventoryReservationSucceeded(payload: InventoryReservedEventPayload): Promise<void> {
        this.logger.log(
            `Inventory reserved for order (${payload.orderId}). CorrelationId: ${payload.correlationId}`,
        );

        await this.commandBus.execute(
            new ConfirmOrderCommand(payload.orderId, payload.correlationId),
        );
    }

    /** Cancel order on inventory.reservation.failed received */
    async onInventoryReservationFailed(
        payload: InventoryReservationFailedEventPayload,
    ): Promise<void> {
        this.logger.warn(
            `Saga: inventory reservation failed for order (${payload.orderId}). CorrelationId: ${payload.correlationId}`,
        );

        await this.commandBus.execute(
            new CancelOrderCommand(
                payload.orderId,
                payload.reason ?? 'INVENTORY_UNAVAILABLE',
                payload.correlationId,
            ),
        );
    }
}
