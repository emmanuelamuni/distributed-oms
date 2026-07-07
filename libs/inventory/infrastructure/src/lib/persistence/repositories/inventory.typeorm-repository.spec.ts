import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryTypeOrmRepository } from './inventory.typeorm-repository';
import { InventoryNodeTypeOrmEntity } from '../entities/inventory-node.typeorm-entity';
import { InventoryMapper } from '../mappers/inventory.mapper';
import { QueryRunner } from 'typeorm';

const makeEntity = (): InventoryNodeTypeOrmEntity => {
    const entity = new InventoryNodeTypeOrmEntity();
    entity.id = 'node-agg-id';
    entity.sku = 'WIDGET-1234';
    entity.nodeId = 'node-001';
    entity.onHand = 50;
    entity.reserved = 0;
    entity.version = 1;
    entity.reservations = [];
    return entity;
};

const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
};

const mockQrRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
};

const mockQueryRunner = {
    manager: {
        getRepository: jest.fn().mockReturnValue(mockQrRepository),
    },
} as unknown as QueryRunner;

describe('InventoryTypeOrmRepository', () => {
    let repository: InventoryTypeOrmRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryTypeOrmRepository,
                {
                    provide: getRepositoryToken(InventoryNodeTypeOrmEntity),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        repository = module.get(InventoryTypeOrmRepository);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findBySkuAndNode', () => {
        it('should return domain aggregate when found', async () => {
            mockRepository.findOne.mockResolvedValue(makeEntity());

            const result = await repository.findBySkuAndNode('WIDGET-1234', 'node-001');

            expect(result).not.toBeNull();
            expect(result!.sku).toBe('WIDGET-1234');
            expect(result!.nodeId).toBe('node-001');
        });

        it('should return null when not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await repository.findBySkuAndNode('WIDGET-1234', 'node-001');

            expect(result).toBeNull();
        });

        it('should query with correct where clause and relations', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await repository.findBySkuAndNode('WIDGET-1234', 'node-001');

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { sku: 'WIDGET-1234', nodeId: 'node-001' },
                relations: { reservations: true },
            });
        });
    });

    describe('findBySku', () => {
        it('should return all nodes for a sku', async () => {
            mockRepository.find.mockResolvedValue([makeEntity(), makeEntity()]);

            const results = await repository.findBySku('WIDGET-1234');

            expect(results).toHaveLength(2);
        });

        it('should return empty array when no nodes found', async () => {
            mockRepository.find.mockResolvedValue([]);

            const results = await repository.findBySku('WIDGET-1234');

            expect(results).toHaveLength(0);
        });

        it('should query with correct where clause', async () => {
            mockRepository.find.mockResolvedValue([]);

            await repository.findBySku('WIDGET-1234');

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { sku: 'WIDGET-1234' },
            });
        });
    });

    describe('save', () => {
        it('should persist using injected repository when no queryRunner provided', async () => {
            const entity = makeEntity();
            mockRepository.findOne.mockResolvedValue(entity);
            const domain = InventoryMapper.toDomain(entity);
            mockRepository.save.mockResolvedValue(undefined);

            await repository.save(domain, undefined);

            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should use queryRunner manager repository when provided', async () => {
            const entity = makeEntity();
            const domain = InventoryMapper.toDomain(entity);
            mockQrRepository.save.mockResolvedValue(undefined);

            await repository.save(domain, mockQueryRunner);

            expect(mockQrRepository.save).toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });
});
