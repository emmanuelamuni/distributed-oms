export interface ReserveInventoryCommandPayload {
    orderId: string;
    correlationId: string;
    lines: Array<{ sku: string; quantity: number }>;
}

export interface ReserveInventoryCommand {
    eventId: string;
    eventType: 'inventory.commands.reserve';
    eventVersion: number;
    occurredAt: string;
    payload: ReserveInventoryCommandPayload;
}
