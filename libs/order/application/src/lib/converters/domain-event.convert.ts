import { DomainEventBase } from '@doms/shared/kernel';
import {
    OrderCreatedEventPayload,
    OrderConfirmedEventPayload,
    OrderCancelledEventPayload,
} from '@doms/shared/events';
import { OrderCreatedEvent, OrderConfirmedEvent, OrderCancelledEvent } from '@doms/order/domain';

export class DomainEventsConverter {
    static toOutboxRecord(event: DomainEventBase, correlationId: string) {
        switch (event.constructor.name) {
            case 'OrderCreatedEvent': {
                const e = event as OrderCreatedEvent;
                return {
                    eventType: 'order.created',
                    payload: {
                        orderId: e.aggregateId,
                        lines: e.lines.map((line) => ({
                            sku: line.sku,
                            quantity: line.quantity,
                        })),
                        createdAt: e.occurredAt.toISOString(),
                        correlationId,
                    } satisfies OrderCreatedEventPayload,
                };
            }

            case 'OrderConfirmedEvent': {
                const e = event as OrderConfirmedEvent;
                return {
                    eventType: 'order.confirmed',
                    payload: {
                        orderId: e.aggregateId,
                        confirmedAt: e.occurredAt.toISOString(),
                        correlationId,
                    } satisfies OrderConfirmedEventPayload,
                };
            }

            case 'OrderCancelledEvent': {
                const e = event as OrderCancelledEvent;
                return {
                    eventType: 'order.cancelled',
                    payload: {
                        orderId: e.aggregateId,
                        reason: e.reason,
                        cancelledAt: e.occurredAt.toISOString(),
                        correlationId,
                    } satisfies OrderCancelledEventPayload,
                };
            }

            default:
                throw new Error(`DomainEventsConverter: No handler for ${event.constructor.name}`);
        }
    }
}
