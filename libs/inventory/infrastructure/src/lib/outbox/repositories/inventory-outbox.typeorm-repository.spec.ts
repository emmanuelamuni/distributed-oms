import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { OutboxRecord, OutboxStatus } from '@doms/shared/outbox';
import { InventoryOutboxTypeOrmRepository } from './inventory-outbox.typeorm-repository';
import { InventoryOutboxTypeOrmEntity } from '../entities/inventory-outbox.typeorm-entity';

const makeMockRepo = (): jest.Mocked<Repository<InventoryOutboxTypeOrmEntity>> =>
    ({
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
    }) as unknown as jest.Mocked<Repository<InventoryOutboxTypeOrmEntity>>;

const makeOutboxRecord = (): OutboxRecord => ({
    id: randomUUID(),
    eventType: 'inventory.reservation.succeeded',
    eventVersion: 1,
    payload: { orderId: 'f2dd59be-b348-40b5-820c-6e23dae14d17' },
    status: OutboxStatus.PENDING,
    createdAt: new Date(),
    publishedAt: null,
    retryCount: 0,
});

describe('OrderOutboxTypeOrmRepository', () => {
    let repository: InventoryOutboxTypeOrmRepository;
    let mockRepo: jest.Mocked<Repository<InventoryOutboxTypeOrmEntity>>;

    beforeEach(() => {
        mockRepo = makeMockRepo();
        repository = new InventoryOutboxTypeOrmRepository(mockRepo);
    });

    afterEach(() => jest.clearAllMocks());

    describe('save', () => {
        it('should persist the outbox record', async () => {
            const record = makeOutboxRecord();
            await repository.save(record);

            expect(mockRepo.save).toHaveBeenCalledWith(record);
        });

        it('should use queryRunner manager when provided', async () => {
            const mockQrRepo = {
                save: jest.fn(),
            } as unknown as Repository<InventoryOutboxTypeOrmEntity>;
            const mockQr = { manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) } };

            await repository.save(makeOutboxRecord(), mockQr);

            expect(mockQrRepo.save).toHaveBeenCalledTimes(1);
            expect(mockRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('findPending', () => {
        it('should query for PENDING records ordered by createdAt ascending', async () => {
            mockRepo.find.mockResolvedValue([]);
            await repository.findPending(10);

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { status: OutboxStatus.PENDING },
                order: { createdAt: 'ASC' },
                take: 10,
            });
        });

        it('should return mapped records', async () => {
            const record = makeOutboxRecord();
            mockRepo.find.mockResolvedValue([record as InventoryOutboxTypeOrmEntity]);
            const result = await repository.findPending(10);

            expect(result).toHaveLength(1);
            expect(result[0].eventType).toBe('inventory.reservation.succeeded');
        });
    });

    describe('markPublished', () => {
        it('should update status to PUBLISHED and set publishedAt', async () => {
            const id = randomUUID();
            await repository.markPublished(id);

            expect(mockRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.PUBLISHED,
                    publishedAt: expect.any(Date),
                }),
            );
        });
    });

    describe('markFailed', () => {
        it('should update status to FAILED and increment retryCount atomically', async () => {
            const id = randomUUID();
            await repository.markFailed(id);

            expect(mockRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.FAILED,
                    retryCount: expect.any(Function),
                }),
            );
        });
    });
});
