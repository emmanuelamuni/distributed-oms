export interface OrderCreatedEventPayload {
    orderId: string;
    lines: Array<{
        sku: string;
        quantity: number;
    }>;
    createdAt: string;
    correlationId: string;
}

export interface OrderCreatedEvent {
    eventId: string;
    eventType: 'order.created';
    eventVersion: 1;
    occurredAt: string;
    correlationId: string;
    payload: OrderCreatedEventPayload;
}
