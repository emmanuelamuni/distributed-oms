import { SKU } from './sku.vo';

describe('SKU', () => {
    it('should create a valid SKU when format is correct', () => {
        const validSku = 'TOOL-12345';
        const sku = SKU.create(validSku);
        expect(sku.value).toBe(validSku);
    });

    it('should normalize valid input values', () => {
        const sku = SKU.create('  tool-12345  ');
        expect(sku.value).toBe('TOOL-12345');
    });

    it('should throw an error for invalid formats', () => {
        const invalidSkus = ['ABC', '12345-TOOL', 'TOOLLONGNAME-123', 'AB-123'];
        invalidSkus.forEach((val) => expect(() => SKU.create(val)).toThrow());
    });

    it('should be equal to another SKU with the same value', () => {
        const sku1 = SKU.create('PROD-9999');
        const sku2 = SKU.create('PROD-9999');
        expect(sku1.equals(sku2)).toBe(true);
    });

    it('should NOT be equal to a different SKU', () => {
        const sku1 = SKU.create('PROD-1111');
        const sku2 = SKU.create('PROD-2222');
        expect(sku1.equals(sku2)).toBe(false);
    });
});
