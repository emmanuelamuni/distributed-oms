import { Money } from './money.vo';

describe('Money', () => {
    describe('create', () => {
        const a = Money.create(109, 'GBP');
        const b = Money.create(1009, 'gbp');
        const c = Money.create(10.09, 'gbp');

        it('should create a valid Money instance', () => {
            expect(a.amount).toBe(109);
            expect(a.currency).toBe('GBP');
            expect(c.amount).toBe(10.09);
        });

        it('should uppercase the currency', () => {
            expect(b.currency).toBe('GBP');
        });

        it('should throw if amount is negative', () => {
            expect(() => Money.create(-1, 'GBP')).toThrow();
        });

        it('should throw if currency is not 3 characters', () => {
            expect(() => Money.create(100, 'GB')).toThrow();
            expect(() => Money.create(100, 'GBPP')).toThrow();
        });
    });

    describe('add', () => {
        const a = Money.create(99, 'GBP');
        const b = Money.create(1000, 'GBP');
        const c = Money.create(1000, 'USD');

        it('should return correct sum for same currency', () => {
            expect(a.add(b).amount).toBe(1099);
        });

        it('should throw if currencies differ', () => {
            expect(() => a.add(c)).toThrow();
        });
    });

    describe('multiply', () => {
        const money = Money.create(500, 'GBP');

        it('should return correct product', () => {
            expect(money.multiply(3).amount).toBe(1500);
        });

        it('should throw if factor is a float', () => {
            expect(() => money.multiply(1.5)).toThrow();
        });

        it('should throw if factor is negative', () => {
            expect(() => money.multiply(-1)).toThrow();
        });
    });

    describe('equals', () => {
        const a = Money.create(1099, 'GBP');
        const b = Money.create(1099, 'GBP');
        const c = Money.create(1000, 'GBP');
        const d = Money.create(1099, 'USD');

        it('should be equal when amount and currency match', () => {
            expect(a.equals(b)).toBe(true);
        });

        it('should not be equal when amount differs', () => {
            expect(a.equals(c)).toBe(false);
        });

        it('should not be equal when currency differs', () => {
            expect(a.equals(d)).toBe(false);
        });
    });
});
