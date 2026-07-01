export interface ReserveInventoryLinesDto {
    sku: string;
    quantity: number;
    nodeId: string;
}

export interface ReserveInventoryDto {
    orderId: string;
    lines: ReserveInventoryLinesDto;
}
