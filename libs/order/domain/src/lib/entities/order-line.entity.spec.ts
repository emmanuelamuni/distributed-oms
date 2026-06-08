import { OrderLine } from './order-line.entity';
import { Money } from '../value-objects/money.vo';

const validProps = {
    sku: 'WIDGET-1234',
    quantity: 2,
    unitPrice: Money.create(500, 'GBP'),
};

describe('OrderLine', () => {
    describe('create', () => {
        it('should create a valid order line', () => {
            const line = OrderLine.create(validProps);

            expect(line.sku).toBe('WIDGET-1234');
            expect(line.quantity).toBe(2);
            expect(line.unitPrice.amount).toBe(500);
        });

        it('should calculate lineTotal correctly', () => {
            const line = OrderLine.create(validProps);
            expect(line.lineTotal().amount).toBe(1000);
        });

        it('should normalize sku to uppercase', () => {
            const line = OrderLine.create({ ...validProps, sku: 'widget-1234' });
            expect(line.sku).toBe('WIDGET-1234');
        });

        it('should throw if quantity is zero', () => {
            expect(() => OrderLine.create({ ...validProps, quantity: 0 })).toThrow();
        });

        it('should throw if quantity is negative', () => {
            expect(() => OrderLine.create({ ...validProps, quantity: -1 })).toThrow();
        });

        it('should throw if quantity is a float', () => {
            expect(() => OrderLine.create({ ...validProps, quantity: 1.5 })).toThrow();
        });

        it('should throw if sku format is invalid', () => {
            expect(() => OrderLine.create({ ...validProps, sku: 'invalid' })).toThrow();
        });

        it('should generate a unique id per line', () => {
            const a = OrderLine.create(validProps);
            const b = OrderLine.create(validProps);

            expect(a.id).not.toBe(b.id);
        });
    });

    describe('equals', () => {
        it('should be equal when ids match', () => {
            const a = OrderLine.create(validProps);
            const b = OrderLine.create(validProps);

            expect(a.equals(b)).toBe(false);
        });

        it('should be equal when same instance compared', () => {
            const a = OrderLine.create(validProps);
            expect(a.equals(a)).toBe(true);
        });
    });
});
