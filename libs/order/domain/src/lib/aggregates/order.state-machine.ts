import { OrderStatusEnum } from '../value-objects/order-status.vo';

const VALID_TRANSITION: Record<OrderStatusEnum, OrderStatusEnum[]> = {
    [OrderStatusEnum.DRAFT]: [OrderStatusEnum.CONFIRMED, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.ALLOCATED, OrderStatusEnum.CANCELLED],
    [OrderStatusEnum.ALLOCATED]: [],
    [OrderStatusEnum.CANCELLED]: [],
};

export class OrderStateMachine {
    static canTransition(from: OrderStatusEnum, to: OrderStatusEnum): boolean {
        return VALID_TRANSITION[from].includes(to);
    }
}
