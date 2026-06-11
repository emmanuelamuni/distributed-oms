import { OrderValidationService } from './order-validation.service';

describe('OrderValidationService', () => {
    describe('validateChannel', () => {
        it('should not throw for a valid channel', () => {
            expect(() => OrderValidationService.validateChannel('web')).not.toThrow();
            expect(() => OrderValidationService.validateChannel('pos')).not.toThrow();
            expect(() => OrderValidationService.validateChannel('api')).not.toThrow();
            expect(() => OrderValidationService.validateChannel('marketplace')).not.toThrow();
        });

        it('should throw for an invalid channel', () => {
            expect(() => OrderValidationService.validateChannel('unknown')).toThrow();
        });

        it('should throw for an empty string', () => {
            expect(() => OrderValidationService.validateChannel('')).toThrow();
        });
    });

    describe('isValidChannel', () => {
        it('should return true for a valid channel', () => {
            expect(OrderValidationService.isValidChannel('web')).toBe(true);
        });

        it('should return false for an invalid channel', () => {
            expect(OrderValidationService.isValidChannel('unknown')).toBe(false);
        });
    });
});
