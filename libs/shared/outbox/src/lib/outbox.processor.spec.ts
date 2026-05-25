import { ConfigService } from '@nestjs/config';
import { OutboxStatus, OutboxRecord } from './outbox.entity';
import { OutboxRepositoryPort } from './outbox.repository.port';
import { OutboxPublisherPort } from './outbox.publisher.port';
import { OutboxProcessor } from './outbox.processor';

const makeRecord = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
    id: 'record-001',
    eventType: 'order.created',
    payload: { orderId: 'order-001' },
    status: OutboxStatus.PENDING,
    createdAt: new Date(),
    publishedAt: null,
    retryCount: 0,
    ...overrides,
});

const mockRepository = (): jest.Mocked<OutboxRepositoryPort> => ({
    save: jest.fn(),
    findPending: jest.fn(),
    markPublished: jest.fn(),
    markFailed: jest.fn(),
});

const mockPublisher = (): jest.Mocked<OutboxPublisherPort> => ({
    publish: jest.fn(),
});

const mockConfigService = (batchSize = 100): jest.Mocked<ConfigService> =>
    ({
        get: jest.fn().mockReturnValue(batchSize),
    }) as unknown as jest.Mocked<ConfigService>;

describe('OutboxProcessor', () => {
    let config: jest.Mocked<ConfigService>;
    let repository: jest.Mocked<OutboxRepositoryPort>;
    let publisher: jest.Mocked<OutboxPublisherPort>;
    let processor: OutboxProcessor;

    beforeEach(() => {
        config = mockConfigService();
        repository = mockRepository();
        publisher = mockPublisher();
        processor = new OutboxProcessor(config, repository, publisher);
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

            expect(repository.findPending).toHaveBeenCalledWith(50);
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
            expect(repository.markPublished).toHaveBeenCalledWith('rec-1');
            expect(repository.markPublished).toHaveBeenCalledWith('rec-2');
        });
    });

    describe('when a publish fails', () => {
        it('should mark the record as failed', async () => {
            const record = makeRecord({ id: 'failing-record' });
            repository.findPending.mockResolvedValue([record]);
            publisher.publish.mockRejectedValue(new Error('Kafka unavailable'));
            repository.markFailed.mockResolvedValue(undefined);

            await processor.process();

            expect(repository.markFailed).toHaveBeenCalledWith('failing-record');
            expect(repository.markPublished).not.toHaveBeenCalled();
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

            expect(repository.markFailed).toHaveBeenCalledWith('failing-record');
            expect(repository.markPublished).toHaveBeenCalledWith('succeeding-record');
        });
    });
});
