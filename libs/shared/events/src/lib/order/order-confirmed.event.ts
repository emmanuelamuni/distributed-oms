export interface OrderConfirmedEventPayload {
    orderId: string;
    correlationId: string;
}

export interface OrderConfirmedEvent {
    eventId: string;
    eventType: 'order.confirmed';
    eventVersion: number;
    occurredAt: string;
    payload: OrderConfirmedEventPayload;
}
