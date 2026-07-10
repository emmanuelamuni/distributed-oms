import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { OutboxProcessor } from '../processor/outbox.processor';
import { OutboxRecord, OutboxStatus } from '../entity/outbox.entity';
import { IOutboxRepositoryPort } from '../ports/outbox.repository.port';
import { IOutboxPublisherPort } from '../ports/outbox.publisher.port';

const makeRecord = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
    id: 'record-001',
    eventType: 'order.created',
    eventVersion: 1,
    payload: { orderId: 'order-001' },
    status: OutboxStatus.PENDING,
    createdAt: new Date(),
    publishedAt: null,
    retryCount: 0,
    ...overrides,
});

const mockRepository = (): jest.Mocked<IOutboxRepositoryPort> => ({
    save: jest.fn(),
    findPending: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
});

const mockPublisher = (): jest.Mocked<IOutboxPublisherPort> => ({
    publish: jest.fn(),
});

const mockConfigService = (batchSize = 100): jest.Mocked<ConfigService> =>
    ({
        get: jest.fn().mockReturnValue(batchSize),
    }) as unknown as jest.Mocked<ConfigService>;

const mockQueryRunner = (): jest.Mocked<QueryRunner> =>
    ({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<QueryRunner>;

describe('OutboxProcessor', () => {
    let config: jest.Mocked<ConfigService>;
    let repository: jest.Mocked<IOutboxRepositoryPort>;
    let publisher: jest.Mocked<IOutboxPublisherPort>;
    let dataSource: jest.Mocked<DataSource>;
    let queryRunner: jest.Mocked<QueryRunner>;
    let processor: OutboxProcessor;

    beforeEach(() => {
        config = mockConfigService();
        repository = mockRepository();
        publisher = mockPublisher();
        queryRunner = mockQueryRunner();

        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        } as unknown as jest.Mocked<DataSource>;

        processor = new OutboxProcessor(dataSource, config, repository, publisher);
    });

    describe('when there are no pending records', () => {
        it('should not call the publisher', async () => {
            repository.findPending.mockResolvedValue([]);

            await processor.process();

            expect(publisher.publish).not.toHaveBeenCalled();
        });

        it('should call findPending with the configured batch size', async () => {
            repository.findPending.mockResolvedValue([]);
            config.get.mockReturnValue(50);

            await processor.process();

            expect(repository.findPending).toHaveBeenCalledWith(50, queryRunner);
        });

        it('should create a transaction, commit and release it', async () => {
            repository.findPending.mockResolvedValue([]);

            await processor.process();

            expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
            expect(queryRunner.connect).toHaveBeenCalledTimes(1);
            expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('when pending records exist', () => {
        it('should publish each record to the correct topic', async () => {
            const records = [
                makeRecord({ id: '1', eventType: 'order.created' }),
                makeRecord({ id: '2', eventType: 'order.confirmed' }),
            ];

            repository.findPending.mockResolvedValue(records);
            publisher.publish.mockResolvedValue(undefined);
            repository.markPublished.mockResolvedValue(undefined);

            await processor.process();

            expect(publisher.publish).toHaveBeenCalledTimes(2);
            expect(publisher.publish).toHaveBeenNthCalledWith(
                1,
                'order.created',
                records[0].payload,
            );
            expect(publisher.publish).toHaveBeenNthCalledWith(
                2,
                'order.confirmed',
                records[1].payload,
            );
        });

        it('should mark each record as published after a successful publish', async () => {
            const records = [makeRecord({ id: 'rec-1' }), makeRecord({ id: 'rec-2' })];

            repository.findPending.mockResolvedValue(records);
            publisher.publish.mockResolvedValue(undefined);
            repository.markPublished.mockResolvedValue(undefined);

            await processor.process();

            expect(repository.markPublished).toHaveBeenCalledTimes(2);
            expect(repository.markPublished).toHaveBeenNthCalledWith(1, 'rec-1', queryRunner);
            expect(repository.markPublished).toHaveBeenNthCalledWith(2, 'rec-2', queryRunner);
        });

        it('should commit and release the transaction after successful processing', async () => {
            repository.findPending.mockResolvedValue([makeRecord()]);
            publisher.publish.mockResolvedValue(undefined);
            repository.markPublished.mockResolvedValue(undefined);

            await processor.process();

            expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('when a publish fails', () => {
        it('should mark the record as failed', async () => {
            const record = makeRecord({ id: 'failing-record' });

            repository.findPending.mockResolvedValue([record]);
            publisher.publish.mockRejectedValue(new Error('Kafka unavailable'));
            repository.markFailed.mockResolvedValue(undefined);

            await processor.process();

            expect(repository.markFailed).toHaveBeenCalledWith('failing-record', queryRunner);
            expect(repository.markPublished).not.toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        });

        it('should continue processing remaining records after a failure', async () => {
            const records = [
                makeRecord({ id: 'failing-record' }),
                makeRecord({ id: 'succeeding-record' }),
            ];

            repository.findPending.mockResolvedValue(records);

            publisher.publish
                .mockRejectedValueOnce(new Error('Kafka unavailable'))
                .mockResolvedValueOnce(undefined);

            repository.markFailed.mockResolvedValue(undefined);
            repository.markPublished.mockResolvedValue(undefined);

            await processor.process();

            expect(repository.markFailed).toHaveBeenCalledWith('failing-record', queryRunner);

            expect(repository.markPublished).toHaveBeenCalledWith('succeeding-record', queryRunner);

            expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        });
    });

    describe('when an unexpected error occurs', () => {
        it('should rollback the transaction and rethrow', async () => {
            const record = makeRecord();

            repository.findPending.mockResolvedValue([record]);
            publisher.publish.mockResolvedValue(undefined);
            repository.markPublished.mockRejectedValue(new Error('Database failure'));
            repository.markFailed.mockRejectedValue(new Error('Cannot mark failed'));

            await expect(processor.process()).rejects.toThrow('Cannot mark failed');

            expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.release).toHaveBeenCalledTimes(1);
        });
    });
});
