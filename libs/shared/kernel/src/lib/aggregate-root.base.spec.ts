import { DomainEventBase } from './domain-event.base';
import { AggregateRootBase } from './aggregate-root.base';

class TestEvent extends DomainEventBase {
    constructor(aggregateId: string) {
        super(aggregateId, 'TestEvent');
    }
}

class TestAggregate extends AggregateRootBase {
    constructor(id: string) {
        super(id);
    }

    recordEvent(): void {
        this.apply(new TestEvent(this.id));
    }
}

describe('AggregateRootBase', () => {
    const aggregate = new TestAggregate('agg-001');

    it('should return an empty array when no events have been applied', () => {
        const events = aggregate.pullDomainEvents();
        expect(events).toHaveLength(0);
    });

    it('should record a domain event when apply is called', () => {
        aggregate.recordEvent();
        const events = aggregate.pullDomainEvents();

        expect(events[0]).toBeInstanceOf(TestEvent);
        expect(events).toHaveLength(1);
    });

    it('should clear domain events after pulling', () => {
        aggregate.recordEvent();
        aggregate.pullDomainEvents();
        const eventsAfterPull = aggregate.pullDomainEvents();

        expect(eventsAfterPull).toHaveLength(0);
    });

    it('should record multiple events in order', () => {
        aggregate.recordEvent();
        aggregate.recordEvent();
        aggregate.recordEvent();

        const events = aggregate.pullDomainEvents();
        expect(events).toHaveLength(3);
    });

    it('should expose the aggregate id', () => {
        expect(aggregate.id).toBe('agg-001');
    });
});
