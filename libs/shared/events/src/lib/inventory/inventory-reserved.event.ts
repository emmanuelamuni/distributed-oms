export interface InventoryReservedEventPayload {
    orderId: string;
    correlationId: string;
    lines: Array<{
        sku: string;
        quantity: number;
        nodeId: string;
    }>;
}

export interface InventoryReservedEvent {
    eventId: string;
    eventType: 'inventory.reservation.succeeded';
    eventVersion: number;
    occurredAt: string;
    payload: InventoryReservedEventPayload;
}
