export class InsufficientInventoryException extends Error {
    constructor(
        readonly sku: string,
        readonly nodeId: string,
        readonly requested: number,
        readonly available: number,
    ) {
        super(
            `Insufficient inventory for SKU ${sku} at node (${nodeId}): requested ${requested}, available ${available}.`,
        );
        this.name = 'InsufficientInventoryException';
    }
}
