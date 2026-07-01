export interface NodeAvailabilityDto {
    nodeId: string;
    available: number;
}

export interface AvailabilityResponseDto {
    sku: string;
    totalAvailable: number;
    nodes: NodeAvailabilityDto[];
}
