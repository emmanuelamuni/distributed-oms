export interface InventoryReservationFailedEventPayload {
    orderId: string;
    correlationId: string;
    reason?: string;
}

export interface InventoryReservationFailedEvent {
    eventId: string;
    eventType: 'inventory.reservation.failed';
    eventVersion: number;
    occurredAt: string;
    payload: InventoryReservationFailedEventPayload;
}
