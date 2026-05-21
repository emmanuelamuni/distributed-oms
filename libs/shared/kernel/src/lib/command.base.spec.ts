import { CommandBase } from './command.base';

class TestCommand extends CommandBase {
    constructor(correlationId?: string) {
        super(correlationId);
    }
}

describe('CommandBase', () => {
    const a = new TestCommand();
    const b = new TestCommand();

    it('should auto-generate a correlationId when none is provided', () => {
        expect(a.correlationId).toBeDefined();
        expect(typeof a.correlationId).toBe('string');
        expect(a.correlationId.length).toBeGreaterThan(10);
    });

    it('should generate unique correlationIds for each instance', () => {
        expect(a.correlationId).not.toBe(b.correlationId);
    });

    it('should use the provided correlationId when given', () => {
        const id = 'my-correlation-id';
        const command = new TestCommand(id);
        expect(command.correlationId).toBe(id);
    });
});
