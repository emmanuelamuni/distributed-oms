import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IOutboxRepositoryPort, OUTBOX_REPOSITORY } from '../ports/outbox.repository.port';
import { IOutboxPublisherPort, OUTBOX_PUBLISHER } from '../ports/outbox.publisher.port';

@Injectable()
export class OutboxProcessor {
    private readonly logger = new Logger(OutboxProcessor.name);

    constructor(
        @Inject(DataSource) private readonly dataSource: DataSource,
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(OUTBOX_REPOSITORY) private readonly repository: IOutboxRepositoryPort,
        @Inject(OUTBOX_PUBLISHER) private readonly publisher: IOutboxPublisherPort,
    ) {}

    @Cron(CronExpression.EVERY_SECOND)
    async process(): Promise<void> {
        const batchSize = this.configService.get('OUTBOX_BATCH_SIZE', 100);

        // Start a queryRunner to enable repository use SKIP LOCKED
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const pending = await this.repository.findPending(batchSize, queryRunner);

        if (pending.length < 1) await queryRunner.release();

        for (const record of pending) {
            try {
                await this.publisher.publish(record.eventType, record.payload);
                await this.repository.markPublished(record.id, queryRunner);

                await queryRunner.commitTransaction();
            } catch (error) {
                this.logger.error(
                    `Failed to publish outbox record ${record.id} (${record.eventType}): ${error}`,
                );

                await this.repository.markFailed(record.id, queryRunner);
                await queryRunner.commitTransaction();
            } finally {
                await queryRunner.release();
            }
        }
    }
}
