import { UniqueId } from '@doms/shared/kernel';

export class OrderId extends UniqueId {
    static create(value: string): OrderId {
        OrderId.validate(value);
        return new OrderId({ value });
    }
}
