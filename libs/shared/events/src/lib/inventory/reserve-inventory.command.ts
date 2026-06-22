export interface ReserveInventoryCommandPayload {
    orderId: string;
    correlationId: string;
    lines: Array<{
        sku: string;
        quantity: number;
    }>;
}

export interface ReserveInventoryCommand {
    eventId: string;
    eventType: 'inventory.commands.reserve';
    eventVersion: 1;
    occurredAt: string;
    correlationId: string;
    payload: ReserveInventoryCommandPayload;
}
