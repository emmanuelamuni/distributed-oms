import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { IOutboxRepositoryPort, OutboxRecord, OutboxStatus } from '@doms/shared/outbox';
import { OrderOutboxTypeOrmEntity } from '../entities/order-outbox.typeorm-entity';

@Injectable()
export class OrderOutboxTypeOrmRepository implements IOutboxRepositoryPort {
    constructor(
        @InjectRepository(OrderOutboxTypeOrmEntity)
        private readonly orderOutboxRepository: Repository<OrderOutboxTypeOrmEntity>,
    ) {}

    private getRepository(queryRunner?: unknown): Repository<OrderOutboxTypeOrmEntity> {
        if (queryRunner && typeof queryRunner === 'object' && 'manager' in queryRunner) {
            const qr = queryRunner as QueryRunner;
            return qr.manager.getRepository(OrderOutboxTypeOrmEntity);
        }

        return this.orderOutboxRepository;
    }

    async save(
        record: Omit<OutboxRecord, 'createdAt' | 'publishedAt' | 'retryCount'>,
        queryRunner: unknown,
    ): Promise<void> {
        await this.getRepository(queryRunner).save(record);
    }

    // SKIP LOCKED must be used to avoid collision
    // order-capture and order-orchestrator both read and update this table
    async findPending(limit: number, queryRunner: unknown): Promise<OutboxRecord[]> {
        // return await this.getRepository(queryRunner).find({
        //     where: { status: OutboxStatus.PENDING },
        //     order: { createdAt: 'ASC' },
        //     take: limit,
        // });

        const qr = queryRunner as QueryRunner;

        return qr.manager.query(
            `SELECT * FROM order_outboxes
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED`,
            [limit],
        );
    }

    async markPublished(id: string, queryRunner: unknown): Promise<void> {
        await this.getRepository(queryRunner).update(id, {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
        });
    }

    async markFailed(id: string, queryRunner: unknown): Promise<void> {
        await this.getRepository(queryRunner).update(id, {
            status: OutboxStatus.FAILED,
            retryCount: () => 'retry_count + 1',
        });
    }
}
