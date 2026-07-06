import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { IOrderRepository, Order } from '@doms/order/domain';
import { OrderTypeOrmEntity } from '../entities/order.typeorm-entity';
import { OrderMapper } from '../mappers/order.mapper';

@Injectable()
export class OrderTypeOrmRepository implements IOrderRepository {
    constructor(
        @InjectRepository(OrderTypeOrmEntity)
        private readonly orderRepository: Repository<OrderTypeOrmEntity>,
    ) {}

    private getRepository(queryRunner?: unknown): Repository<OrderTypeOrmEntity> {
        if (queryRunner && typeof queryRunner === 'object' && 'manager' in queryRunner) {
            const qr = queryRunner as QueryRunner;
            return qr.manager.getRepository(OrderTypeOrmEntity);
        }

        return this.orderRepository;
    }

    async save(order: Order, queryRunner?: unknown): Promise<void> {
        const repo = this.getRepository(queryRunner);
        const entity = OrderMapper.toPersistence(order);
        await repo.save(entity);
    }

    async findById(id: string, queryRunner?: unknown): Promise<Order | null> {
        const repo = this.getRepository(queryRunner);
        const entity = await repo.findOne({
            where: { id },
            relations: { lines: true },
        });
        return entity ? OrderMapper.toDomain(entity) : null;
    }

    async exists(id: string, queryRunner?: unknown): Promise<boolean> {
        const repo = this.getRepository(queryRunner);
        return (await repo.count({ where: { id } })) > 0;
    }
}
