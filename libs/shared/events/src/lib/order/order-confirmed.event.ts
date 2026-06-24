export interface OrderConfirmedEventPayload {
    orderId: string;
    confirmedAt: string;
    correlationId: string;
}

export interface OrderConfirmedEvent {
    eventId: string;
    eventType: 'order.confirmed';
    eventVersion: 1;
    occurredAt: string;
    correlationId: string;
    payload: OrderConfirmedEventPayload;
}
