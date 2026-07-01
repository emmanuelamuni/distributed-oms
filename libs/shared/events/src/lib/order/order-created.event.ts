export interface OrderCreatedEventPayload {
    orderId: string;
    correlationId: string;
    lines: Array<{ sku: string; quantity: number }>;
}

export interface OrderCreatedEvent {
    eventId: string;
    eventType: 'order.created';
    eventVersion: number;
    occurredAt: string;
    payload: OrderCreatedEventPayload;
}
