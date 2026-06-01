import { ValueObjectBase } from '@doms/shared/kernel';

export enum OrderStatusEnum {
    DRAFT = 'DRAFT',
    CONFIRMED = 'CONFIRMED',
    ALLOCATED = 'ALLOCATED',
    CANCELLED = 'CANCELLED',
}

export interface OrderStatusProps {
    value: OrderStatusEnum;
}

export class OrderStatus extends ValueObjectBase<OrderStatusProps> {
    static create(value: OrderStatusEnum): OrderStatus {
        if (!Object.values(OrderStatusEnum).includes(value)) {
            throw new Error(`Invalid order status. Value: ${value}`);
        }

        return new OrderStatus({ value });
    }

    isTerminal(): boolean {
        return this.props.value === OrderStatusEnum.CANCELLED;
    }

    isCancellable(): boolean {
        return [OrderStatusEnum.DRAFT, OrderStatusEnum.CONFIRMED].includes(this.value);
    }

    get value(): OrderStatusEnum {
        return this.props.value;
    }
}
