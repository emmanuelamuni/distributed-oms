import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import {
    INVENTORY_REPOSITORY,
    IInventoryRepositoryPort,
    InventoryNode,
} from '@doms/inventory/domain';
import { ReleaseReservationCommand } from './release-reservation.command';

/* Triggered by the cancellation of order that's been reserved */
@CommandHandler(ReleaseReservationCommand)
export class ReleaseReservationHandler implements ICommandHandler<ReleaseReservationCommand> {
    private readonly logger = new Logger(ReleaseReservationHandler.name);

    constructor(
        @Inject(INVENTORY_REPOSITORY)
        private readonly inventoryRepository: IInventoryRepositoryPort,
        @Inject(DataSource) private readonly dataSource: DataSource,
    ) {}

    async execute(command: ReleaseReservationCommand): Promise<void> {
        const { payload } = command;
        if (!payload.lines) return;

        let inventoryNodes: InventoryNode[] | null = null;
        let queryRunner: QueryRunner | null = null;

        try {
            const items = payload.lines.sort((a, b) => {
                if (a.nodeId > b.nodeId) return -1;
                if (a.nodeId < b.nodeId) return 1;
                return 0;
            });

            // Load up InventoryNode
            inventoryNodes = await this.inventoryRepository.findBySkusAndNodes(items);

            if (inventoryNodes.length !== items.length) {
                throw new Error(`No InventoryNodes found for the provided SKUs and Node IDs`);
            }

            queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            for (const item of items) {
                const node = inventoryNodes.find(
                    (n) => n.sku === item.sku && n.nodeId === item.nodeId,
                );

                if (!node)
                    throw new Error(
                        `InventoryNode not found for SKU: ${item.sku}, Node ID: ${item.nodeId}`,
                    );

                node.releaseReservation(payload.correlationId);

                await this.inventoryRepository.save(node, queryRunner);
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive)
                await queryRunner.rollbackTransaction();

            this.logger.error(
                `Error releasing reservations with correlationId: ${payload.correlationId}. ${error}`,
            );
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release();
        }
    }
}
