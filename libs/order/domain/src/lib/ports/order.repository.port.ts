import { Order } from '../aggregates/order.aggregate';

export interface IOrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
    exists(id: string): Promise<boolean>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
