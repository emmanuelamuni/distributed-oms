export class InventoryUnavailableException extends Error {
    constructor(readonly sku: string) {
        super(`Unavailable inventory. SKU: ${sku}.`);
        this.name = 'InventoryUnavailableException';
    }
}
