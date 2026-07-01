import { DomainEventBase } from '@doms/shared/kernel';

export class OrderConfirmedDomainEvent extends DomainEventBase {
    constructor(orderId: string, eventType = OrderConfirmedDomainEvent.name) {
        super(orderId, eventType);
    }
}
