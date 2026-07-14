import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
    InventoryReservedEventPayload,
    InventoryReservationFailedEventPayload,
} from '@doms/shared/events';
import { ConfirmOrderCommand } from '../commands/confirm-order.command';
import { CancelOrderCommand } from '../commands/cancel-order.command';

@Injectable()
export class OrderSaga {
    private readonly logger = new Logger(OrderSaga.name);

    constructor(@Inject(CommandBus) private readonly commandBus: CommandBus) {}

    /** Confirm order on inventory.reservation.succeeded received */
    async onInventoryReservationSucceeded(payload: InventoryReservedEventPayload): Promise<void> {
        this.logger.log(
            `Saga: inventory reserved for order (${payload.orderId}). CorrelationId: ${payload.correlationId}`,
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
