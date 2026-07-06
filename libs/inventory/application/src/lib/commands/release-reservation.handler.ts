import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
        let inventoryNode: InventoryNode | null = null;
        const { sku, nodeId, correlationId } = command;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            // Load up InventoryNode
            inventoryNode = await this.inventoryRepository.findBySkuAndNode(sku, nodeId);

            if (!inventoryNode) {
                throw new Error(`No InventoryNode found for SKU: ${sku}`);
            }

            inventoryNode.releaseReservation(correlationId);

            await queryRunner.startTransaction();
            await this.inventoryRepository.save(inventoryNode, queryRunner);
            await queryRunner.commitTransaction();
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
            this.logger.error(
                `Unable to release reservation. CorrelationId: ${correlationId}. Error: ${error}`,
            );
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release();
        }
    }
}
