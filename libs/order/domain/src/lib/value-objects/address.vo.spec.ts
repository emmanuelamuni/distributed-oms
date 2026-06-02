import { Address } from './address.vo';

const validProps = {
    street: '123 Ogunlana Drive',
    city: 'Surulere',
    state: 'Lagos',
    postcode: '107106',
    country: 'NG',
};

describe('Address', () => {
    describe('create', () => {
        it('should create a valid address', () => {
            const address = Address.create(validProps);

            expect(address.street).toBe('123 Ogunlana Drive');
            expect(address.country).toBe('NG');
        });

        it('should uppercase the country', () => {
            const address = Address.create({ ...validProps, country: 'us' });
            expect(address.country).toBe('US');
        });

        it('should trim all fields', () => {
            const address = Address.create({ ...validProps, city: '  Ajah  ' });
            expect(address.city).toBe('Ajah');
        });

        it.each(['street', 'city', 'state', 'postcode', 'country'] as const)(
            'should throw if %s is empty',
            (field) => {
                expect(() => Address.create({ ...validProps, [field]: '' })).toThrow();
            },
        );

        it('should throw if country is not 2 letters', () => {
            expect(() => Address.create({ ...validProps, country: 'NGR' })).toThrow();
            expect(() => Address.create({ ...validProps, country: 'N' })).toThrow();
        });
    });

    describe('equals', () => {
        it('should be equal when all fields match', () => {
            const a = Address.create(validProps);
            const b = Address.create(validProps);

            expect(a.equals(b)).toBe(true);
        });

        it('should not be equal when any field differs', () => {
            const a = Address.create(validProps);
            const b = Address.create({ ...validProps, city: 'Ikoyi' });

            expect(a.equals(b)).toBe(false);
        });
    });
});
