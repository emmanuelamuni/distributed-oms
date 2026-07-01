import { DomainEventBase } from '@doms/shared/kernel';

export class OrderCancelledDomainEvent extends DomainEventBase {
    public readonly reason: string;

    constructor(orderId: string, reason: string, eventType = OrderCancelledDomainEvent.name) {
        super(orderId, eventType);
        this.reason = reason;
    }
}
