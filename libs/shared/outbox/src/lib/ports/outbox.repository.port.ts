import { OutboxRecord } from '../entity/outbox.entity';

export interface IOutboxRepositoryPort {
    save(
        record: Omit<OutboxRecord, 'createdAt' | 'publishedAt' | 'retryCount'>,
        queryRunner?: unknown,
    ): Promise<void>;
    findPending(limit: number, queryRunner: unknown): Promise<OutboxRecord[]>;
    markPublished(id: string, queryRunner?: unknown): Promise<void>;
    markFailed(id: string, queryRunner?: unknown): Promise<void>;
}

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');
