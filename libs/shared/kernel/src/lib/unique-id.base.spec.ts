import { UniqueId } from './unique-id.base';

class TestId extends UniqueId {
    static create(value: string): TestId {
        TestId.validate(value);
        return new TestId({ value });
    }
}

describe('UniqueId', () => {
    const validUUID = '123e4567-e89b-4d3a-a456-426614174000';
    const a = TestId.create(validUUID);
    const b = TestId.create(validUUID);
    const c = TestId.create('223e4567-e89b-4d3a-a456-426614174000');

    it('should create with a valid UUID v4', () => {
        expect(a.value).toBe(validUUID);
    });

    it('should throw for an empty string', () => {
        expect(() => TestId.create('')).toThrow();
    });

    it('should throw for a non-UUID string', () => {
        expect(() => TestId.create('not-a-uuid')).toThrow();
    });

    it('should throw for a UUID v1', () => {
        expect(() => TestId.create('550e8400-e29b-11d4-a716-446655440000')).toThrow();
    });

    it('should be equal when values match', () => {
        expect(a.equals(b)).toBe(true);
    });

    it('should not be equal when values differ', () => {
        expect(a.equals(c)).toBe(false);
    });
});
