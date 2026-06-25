import { Quantity } from './quantity.value-object';

describe('Quantity', () => {
    it('should create with a positive integer', () => {
        expect(Quantity.create(5).value).toBe(5);
    });

    it('should throw on zero', () => {
        expect(() => Quantity.create(0)).toThrow();
    });

    it('should throw on negative', () => {
        expect(() => Quantity.create(-1)).toThrow();
    });

    it('should throw on non-integer', () => {
        expect(() => Quantity.create(1.5)).toThrow();
    });

    it('should add two quantities', () => {
        expect(Quantity.create(3).add(Quantity.create(4)).value).toBe(7);
    });

    it('should subtract quantities', () => {
        expect(Quantity.create(5).subtract(Quantity.create(3)).value).toBe(2);
    });

    it('should throw on negative subtraction result', () => {
        expect(() => Quantity.create(2).subtract(Quantity.create(5))).toThrow();
    });

    it('should return zero from Quantity.zero()', () => {
        expect(Quantity.zero().value).toBe(0);
    });

    it('should create from raw non-negative integer including zero', () => {
        expect(Quantity.fromRaw(0).value).toBe(0);
        expect(Quantity.fromRaw(5).value).toBe(5);
    });

    it('should throw on negative raw value', () => {
        expect(() => Quantity.fromRaw(-1)).toThrow();
    });
});
