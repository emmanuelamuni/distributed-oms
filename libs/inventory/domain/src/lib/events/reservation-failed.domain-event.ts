import { DomainEventBase } from '@doms/shared/kernel';

export class ReservationFailedDomainEvent extends DomainEventBase {
    constructor(
        readonly orderId: string,
        readonly reason: string,
    ) {
        super(orderId, ReservationFailedDomainEvent.name);
    }
}
