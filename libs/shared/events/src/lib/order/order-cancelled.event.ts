export interface OrderCancelledEventPayload {
    orderId: string;
    correlationId: string;
    reason: string;
}

export interface OrderCancelledEvent {
    eventId: string;
    eventType: 'order.cancelled';
    eventVersion: number;
    occurredAt: string;
    payload: OrderCancelledEventPayload;
}
