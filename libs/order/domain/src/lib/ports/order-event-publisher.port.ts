import { DomainEventBase } from '@doms/shared/kernel';

export interface IOrderEventPublisher {
    publish(events: DomainEventBase[]): Promise<void>;
}

export const ORDER_EVENT_PUBLISHER = Symbol('ORDER_EVENT_PUBLISHER');
