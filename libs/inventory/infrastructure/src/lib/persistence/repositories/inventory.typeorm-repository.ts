import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, In } from 'typeorm';
import { InventoryNode, IInventoryRepositoryPort } from '@doms/inventory/domain';
import { InventoryNodeTypeOrmEntity } from '../entities/inventory-node.typeorm-entity';
import { InventoryMapper } from '../mappers/inventory.mapper';

@Injectable()
export class InventoryTypeOrmRepository implements IInventoryRepositoryPort {
    constructor(
        @InjectRepository(InventoryNodeTypeOrmEntity)
        private readonly repository: Repository<InventoryNodeTypeOrmEntity>,
    ) {}

    private getRepository(queryRunner?: unknown): Repository<InventoryNodeTypeOrmEntity> {
        if (queryRunner && typeof queryRunner === 'object' && 'manager' in queryRunner) {
            const qr = queryRunner as QueryRunner;
            return qr.manager.getRepository(InventoryNodeTypeOrmEntity);
        }

        return this.repository;
    }

    async save(inventoryNode: InventoryNode, queryRunner: unknown): Promise<void> {
        const entity = InventoryMapper.toPersistence(inventoryNode);
        const repo = this.getRepository(queryRunner);
        await repo.save(entity);
    }

    async findBySkusAndNodes(items: { sku: string; nodeId: string }[]): Promise<InventoryNode[]> {
        const repo = this.getRepository();

        const inventoryNodes = await repo.find({
            where: items,
            relations: { reservations: true },
        });

        return inventoryNodes.map(InventoryMapper.toDomain);
    }

    async findBySkus(skus: string[]): Promise<Map<string, InventoryNode[]>> {
        const repo = this.getRepository();
        const dbEntities = await repo.find({ where: { sku: In(skus) } });

        const grouped = new Map<string, InventoryNode[]>();

        for (const entity of dbEntities) {
            const domainEntity = InventoryMapper.toDomain(entity);
            const existing = grouped.get(domainEntity.sku);

            if (existing) {
                existing.push(domainEntity);
            } else {
                grouped.set(domainEntity.sku, [domainEntity]);
            }
        }

        return grouped;
    }
}
