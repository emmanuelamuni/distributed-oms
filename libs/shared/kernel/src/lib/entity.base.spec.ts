import { EntityBase } from './entity.base';

class TestEntity extends EntityBase<{ name: string }> {
    constructor(id: string) {
        super(id);
    }
}

class OtherEntity extends EntityBase<{ name: string }> {
    constructor(id: string) {
        super(id);
    }
}

describe('EntityBase', () => {
    const a = new TestEntity('entity-001');
    const b = new TestEntity('entity-001');
    const c = new TestEntity('entity-002');

    it('should expose the id via getter', () => {
        expect(a.id).toBe('entity-001');
    });

    it('should return true for two entities with the same id', () => {
        expect(a.equals(b)).toBe(true);
    });

    it('should return false for two entities with different ids', () => {
        expect(a.equals(c)).toBe(false);
    });

    it('should return false when compared against null', () => {
        expect(a.equals(null as unknown as TestEntity)).toBe(false);
    });

    it('should return false when compared against undefined', () => {
        expect(a.equals(undefined as unknown as TestEntity)).toBe(false);
    });

    it('should return true regardless of subclass type as long as id matches', () => {
        // EntityBase uses instanceof EntityBase
        const o = new OtherEntity('entity-001');
        expect(a.equals(o as unknown as TestEntity)).toBe(true);
    });
});
