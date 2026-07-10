import { randomUUID } from 'node:crypto';
import { QueryRunner, Repository } from 'typeorm';
import { OutboxRecord, OutboxStatus } from '@doms/shared/outbox';
import { InventoryOutboxTypeOrmRepository } from './inventory-outbox.typeorm-repository';
import { InventoryOutboxTypeOrmEntity } from '../entities/inventory-outbox.typeorm-entity';

const makeMockRepo = (): jest.Mocked<Repository<InventoryOutboxTypeOrmEntity>> =>
    ({
        save: jest.fn(),
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

describe('InventoryOutboxTypeOrmRepository', () => {
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

            await repository.save(record, undefined);

            expect(mockRepo.save).toHaveBeenCalledWith(record);
        });

        it('should use queryRunner manager when provided', async () => {
            const mockQrRepo = {
                save: jest.fn(),
            } as unknown as Repository<InventoryOutboxTypeOrmEntity>;

            const mockQr = {
                manager: {
                    getRepository: jest.fn().mockReturnValue(mockQrRepo),
                },
            } as unknown as QueryRunner;

            await repository.save(makeOutboxRecord(), mockQr);

            expect(mockQr.manager.getRepository).toHaveBeenCalledWith(InventoryOutboxTypeOrmEntity);
            expect(mockQrRepo.save).toHaveBeenCalledTimes(1);
            expect(mockRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('findPending', () => {
        it('should execute the SKIP LOCKED query', async () => {
            const record = makeOutboxRecord();

            const mockQr = {
                manager: {
                    query: jest.fn().mockResolvedValue([record]),
                },
            } as unknown as QueryRunner;

            const result = await repository.findPending(10, mockQr);

            expect(mockQr.manager.query).toHaveBeenCalledWith(
                `SELECT * FROM inventory_outboxes
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED`,
                [10],
            );

            expect(result).toEqual([record]);
        });
    });

    describe('markPublished', () => {
        it('should update status to PUBLISHED and set publishedAt', async () => {
            const id = randomUUID();

            await repository.markPublished(id, undefined);

            expect(mockRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.PUBLISHED,
                    publishedAt: expect.any(Date),
                }),
            );
        });

        it('should use queryRunner manager when provided', async () => {
            const mockQrRepo = {
                update: jest.fn(),
            } as unknown as Repository<InventoryOutboxTypeOrmEntity>;

            const mockQr = {
                manager: {
                    getRepository: jest.fn().mockReturnValue(mockQrRepo),
                },
            } as unknown as QueryRunner;

            const id = randomUUID();

            await repository.markPublished(id, mockQr);

            expect(mockQr.manager.getRepository).toHaveBeenCalledWith(InventoryOutboxTypeOrmEntity);
            expect(mockQrRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.PUBLISHED,
                    publishedAt: expect.any(Date),
                }),
            );
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
    });

    describe('markFailed', () => {
        it('should update status to FAILED and increment retryCount atomically', async () => {
            const id = randomUUID();

            await repository.markFailed(id, undefined);

            expect(mockRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.FAILED,
                    retryCount: expect.any(Function),
                }),
            );
        });

        it('should use queryRunner manager when provided', async () => {
            const mockQrRepo = {
                update: jest.fn(),
            } as unknown as Repository<InventoryOutboxTypeOrmEntity>;

            const mockQr = {
                manager: {
                    getRepository: jest.fn().mockReturnValue(mockQrRepo),
                },
            } as unknown as QueryRunner;

            const id = randomUUID();

            await repository.markFailed(id, mockQr);

            expect(mockQr.manager.getRepository).toHaveBeenCalledWith(InventoryOutboxTypeOrmEntity);
            expect(mockQrRepo.update).toHaveBeenCalledWith(
                id,
                expect.objectContaining({
                    status: OutboxStatus.FAILED,
                    retryCount: expect.any(Function),
                }),
            );
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
    });
});
