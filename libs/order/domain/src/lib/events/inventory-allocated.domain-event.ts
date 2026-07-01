import { DomainEventBase } from '@doms/shared/kernel';

// Later phases when hard commit is involved
export class InventoryAllocatedDomainEvent extends DomainEventBase {
    public readonly reservationId: string; // A.K.A Correlation ID

    constructor(
        orderId: string,
        reservationId: string,
        eventType = InventoryAllocatedDomainEvent.name,
    ) {
        super(orderId, eventType);
        this.reservationId = reservationId;
    }
}
