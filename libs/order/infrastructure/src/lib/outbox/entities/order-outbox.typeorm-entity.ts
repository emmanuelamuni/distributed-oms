import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { OutboxStatus, OutboxRecord } from '@doms/shared/outbox';

@Entity('order_outbox')
export class OrderOutboxTypeOrmEntity implements OutboxRecord {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'event_type', type: 'varchar' })
    eventType!: string;

    @Column({ type: 'jsonb' })
    payload!: Record<string, unknown>;

    @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
    status!: OutboxStatus;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    @Column({ name: 'published_at', type: 'timestamp', nullable: true })
    publishedAt!: Date | null;

    @Column({ name: 'retry_count', type: 'int', default: 0 })
    retryCount!: number;
}
