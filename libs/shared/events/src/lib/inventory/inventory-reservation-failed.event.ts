export interface InventoryReservationFailedEventPayload {
    orderId: string;
    reason?: string;
    failedAt: string;
    correlationId: string;
}

export interface InventoryReservationFailedEvent {
    eventId: string;
    eventType: 'inventory.reservation.failed';
    eventVersion: 1;
    occurredAt: string;
    correlationId: string;
    payload: InventoryReservationFailedEventPayload;
}
