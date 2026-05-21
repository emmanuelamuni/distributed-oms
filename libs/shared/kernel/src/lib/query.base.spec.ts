import { QueryBase } from './query.base';

class TestQuery extends QueryBase {
    constructor(correlationId?: string) {
        super(correlationId);
    }
}

describe('QueryBase', () => {
    const a = new TestQuery();
    const b = new TestQuery();

    it('should auto-generate a correlationId when none is provided', () => {
        expect(a.correlationId).toBeDefined();
        expect(typeof a.correlationId).toBe('string');
        expect(a.correlationId.length).toBeGreaterThan(10);
    });

    it('should generate unique correlationIds for each instance', () => {
        expect(a.correlationId).not.toBe(b.correlationId);
    });

    it('should use the provided correlationId when given', () => {
        const id = 'trace-id-xyz';
        const command = new TestQuery(id);
        expect(command.correlationId).toBe(id);
    });
});
