import { ValueObjectBase } from './value-object.base';

interface MoneyProps extends Record<string, unknown> {
    amount: number;
    currency: string;
}

interface AddressProps extends Record<string, unknown> {
    street: string;
    city: string;
    postedAt?: Date;
}

class Money extends ValueObjectBase<MoneyProps> {
    constructor(props: MoneyProps) {
        super(props);
    }
}

class Address extends ValueObjectBase<AddressProps> {
    constructor(props: AddressProps) {
        super(props);
    }
}

describe('ValueObjectBase', () => {
    describe('equals', () => {
        const a = new Money({ amount: 100, currency: 'GBP' });
        const b = new Money({ amount: 100, currency: 'GBP' });
        const c = new Money({ amount: 200, currency: 'GBP' });
        const address = new Address({ street: '100', city: 'GBP' });

        it('should return true for two instances with identical primitive props', () => {
            expect(a.equals(b)).toBe(true);
        });

        it('should return false when primitive props differ', () => {
            expect(a.equals(c)).toBe(false);
        });

        it('should return false for two different value object types with same prop values', () => {
            // Same values of 100/GBP shaped, but different constructors
            expect(a.equals(address as unknown as Money)).toBe(false);
        });

        it('should return false when compared against null', () => {
            expect(a.equals(null as unknown as Money)).toBe(false);
        });

        it('should return false when compared against undefined', () => {
            expect(a.equals(undefined)).toBe(false);
        });

        it('should return true for nested Date props with same value', () => {
            const date = new Date('2026-01-01T00:00:00Z');
            const a = new Address({ street: '1 First St', city: 'Agodi', postedAt: date });
            const b = new Address({
                street: '1 First St',
                city: 'Agodi',
                postedAt: new Date('2026-01-01T00:00:00Z'),
            });
            expect(a.equals(b)).toBe(true);
        });

        it('should return false for nested Date props with different values', () => {
            const a = new Address({
                street: '1 First St',
                city: 'Agodi',
                postedAt: new Date('2026-01-01'),
            });
            const b = new Address({
                street: '1 First St',
                city: 'Agodi',
                postedAt: new Date('2026-06-06'),
            });
            expect(a.equals(b)).toBe(false);
        });

        it('should enforce immutability', () => {
            const money = a as unknown as { props: MoneyProps };
            expect(() => {
                money.props.amount = 999;
            }).toThrow();
        });
    });
});
