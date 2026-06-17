import { Order } from '../aggregates/order.aggregate';

export interface IOrderRepository {
    save(order: Order, queryRunner?: unknown): Promise<void>;
    findById(id: string, queryRunner?: unknown): Promise<Order | null>;
    exists(id: string, queryRunner?: unknown): Promise<boolean>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
