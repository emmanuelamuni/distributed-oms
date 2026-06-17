import { DomainEventBase } from './domain-event.base';

export abstract class AggregateRootBase {
    public readonly _id: string;
    private _domainEvents: DomainEventBase[] = [];

    constructor(id: string) {
        this._id = id;
    }

    protected apply(domainEvent: DomainEventBase): void {
        this._domainEvents.push(domainEvent);
    }

    pullDomainEvents(): DomainEventBase[] {
        const events = [...this._domainEvents];
        this._domainEvents = [];
        return events;
    }

    get id(): string {
        return this._id;
    }
}
