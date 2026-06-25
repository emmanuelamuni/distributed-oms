import { DomainEventBase } from '@doms/shared/kernel';

export class InventoryReservedDomainEvent extends DomainEventBase {
    constructor(
        readonly reservationId: string,
        readonly orderId: string,
        readonly sku: string,
        readonly nodeId: string,
        readonly quantity: number,
    ) {
        super(orderId, InventoryReservedDomainEvent.name);
    }
}
