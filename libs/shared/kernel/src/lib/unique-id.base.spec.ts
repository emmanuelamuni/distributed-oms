import { UniqueId } from './unique-id.base';

describe('UniqueId', () => {
    const v1UUID = 'c4af15f1-d1fa-11d4-92fa-a2a123a0143f';
    const validUUID = '1cf295da-93af-46ba-a156-d0beb438ece1';

    const id = UniqueId.create();
    const id2 = UniqueId.fromExisting(validUUID);
    const id3 = UniqueId.fromExisting(validUUID);

    it('should create a new random UUID v4', () => {
        expect(id.value).toBeDefined();
        expect(id.value).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
    });

    it('should hydrate from an existing valid UUID', () => {
        expect(id2.value).toBe(validUUID);
    });

    it('should throw for an empty string', () => {
        expect(() => UniqueId.fromExisting('')).toThrow();
    });

    it('should throw for a non-UUID string', () => {
        expect(() => UniqueId.fromExisting('not-a-uuid')).toThrow();
    });

    it('should throw for a UUID v1', () => {
        expect(() => UniqueId.fromExisting(v1UUID)).toThrow();
    });

    it('should be equal when values match', () => {
        expect(id2.equals(id3)).toBe(true);
    });

    it('should not be equal when values differ', () => {
        expect(id.equals(id2)).toBe(false);
    });
});
