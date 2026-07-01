import { DomainEventBase } from '@doms/shared/kernel';
import { OrderLine } from '../entities/order-line.entity';

export class OrderCreatedDomainEvent extends DomainEventBase {
    constructor(
        public readonly orderId: string,
        public readonly lines: OrderLine[],
    ) {
        super(orderId, OrderCreatedDomainEvent.name);
    }
}
