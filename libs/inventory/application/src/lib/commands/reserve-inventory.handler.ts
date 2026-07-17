import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { INVENTORY_LOCK, IInventoryLockPort } from '@doms/inventory/domain';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import {
    InventoryReservedEvent,
    InventoryReservationFailedEvent,
    ReserveInventoryCommandPayload,
} from '@doms/shared/events';

import {
    INVENTORY_REPOSITORY,
    IInventoryRepositoryPort,
    InsufficientInventoryException,
    ReservationAlreadyExistsException,
    Quantity,
} from '@doms/inventory/domain';

// import { AvailabilityResponseDto } from '../dtos/availability-response.dto';
import { GetAvailabilityService } from '../services/get-availability.service';
import { ReserveInventoryCommand } from './reserve-inventory.command';

/**
 * Handler to reserve inventory for an order
 * Rolls back reservation in the event of failure
 * Writes outbox for either instance of success or failure
 */
@CommandHandler(ReserveInventoryCommand)
export class ReserveInventoryHandler implements ICommandHandler<ReserveInventoryCommand> {
    private readonly logger = new Logger(ReserveInventoryHandler.name);

    constructor(
        @Inject(INVENTORY_LOCK)
        private readonly inventoryLock: IInventoryLockPort,
        @Inject(IDEMPOTENCY_STORE)
        private readonly store: IIdempotencyStorePort,
        @Inject(OUTBOX_REPOSITORY)
        private readonly outboxRepository: IOutboxRepositoryPort,
        @Inject(INVENTORY_REPOSITORY)
        private readonly inventoryRepository: IInventoryRepositoryPort,
        @Inject(DataSource) private readonly dataSource: DataSource,
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(GetAvailabilityService)
        private readonly availabilityService: GetAvailabilityService,
    ) {}

    private async writeFailureOutbox(
        payload: ReserveInventoryCommandPayload,
        reason?: string,
    ): Promise<void> {
        // Create failure event
        const failureEvent: InventoryReservationFailedEvent = {
            eventId: randomUUID(),
            eventType: 'inventory.reservation.failed',
            eventVersion: 1,
            occurredAt: new Date().toISOString(),
            payload: {
                orderId: payload.orderId,
                correlationId: payload.correlationId,
                reason,
            },
        };

        // Create a new queryRunner to mange this transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await this.outboxRepository.save(
                {
                    id: failureEvent.eventId,
                    eventType: failureEvent.eventType,
                    eventVersion: failureEvent.eventVersion,
                    status: OutboxStatus.PENDING,
                    payload: failureEvent.payload as unknown as Record<string, unknown>,
                },
                queryRunner,
            );
        } catch {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release();
        }
    }

    async execute(command: ReserveInventoryCommand): Promise<void> {
        const { payload } = command;

        // Check cache and return if already reserved
        const corrKey = `${payload.correlationId}:reserve-inventory`;
        if (await this.store.has(corrKey)) return;

        const acquiredLocks: string[] = [];
        let queryRunner: QueryRunner | null = null;
        // let availabilityResponse: AvailabilityResponseDto[] | null;

        try {
            const skus = payload.lines.map((line) => line.sku);

            // Use application service in place of handler chaining
            const availabilityResponse = await this.availabilityService.execute(skus);

            if (!availabilityResponse)
                throw new Error(`No inventory for order: ${payload.orderId}`);

            // Construct array holding SKU, nodeId, and quantity to reserve on
            const toReserve: Array<{ sku: string; quantity: number; nodeId: string }> = [];

            for (const line of payload.lines) {
                const availability = availabilityResponse.find((a) => line.sku === a.sku);
                if (!availability) throw new Error(`Cannot reserve on missing SKU: ${line.sku}`);

                const node = availability.nodes.find((n) => n.available >= line.quantity);
                if (!node) throw new Error(`No matching node with enough quantity for ${line.sku}`);

                toReserve.push({ sku: line.sku, quantity: line.quantity, nodeId: node.nodeId });
            }

            // Sort potential reservations to prevent future deadlock
            toReserve.sort((a, b) => {
                if (a.nodeId > b.nodeId) return -1;
                if (a.nodeId < b.nodeId) return 1;
                return 0;
            });

            // Ascending (A-Z)
            // toReserve.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));

            // Acquire distributed locks to prevent race conditions
            for (const line of toReserve) {
                const lockKey = `inventory-lock:${line.sku}:${line.nodeId}`;

                const acquired = await this.inventoryLock.acquire(
                    lockKey,
                    this.configService.get('INVENTORY_LOCK_TTL_MS', 5000),
                );

                if (!acquired) {
                    throw new Error(
                        `Failed to acquire lock for SKU: ${line.sku} at node: ${line.nodeId}`,
                    );
                }

                acquiredLocks.push(lockKey);
            }

            // Fetch fresh data based on selected node and reserve
            const items = toReserve.map((tr) => ({ sku: tr.sku, nodeId: tr.nodeId }));
            const inventoryNodes = await this.inventoryRepository.findBySkusAndNodes(items);

            // Start a transaction
            queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            for (const tr of toReserve) {
                const skuNode = inventoryNodes.find(
                    (n) => tr.sku === n.sku && tr.nodeId === n.nodeId,
                );

                if (!skuNode)
                    throw new Error(
                        `Error trying to reserve sku (${tr.sku}) on node (${tr.nodeId})`,
                    );

                skuNode.reserve(
                    payload.correlationId,
                    payload.orderId,
                    Quantity.create(tr.quantity),
                );
                skuNode.pullDomainEvents();

                await this.inventoryRepository.save(skuNode, queryRunner);
            }

            // Write to outbox
            const successfulEvent: InventoryReservedEvent = {
                eventId: randomUUID(),
                eventType: 'inventory.reservation.succeeded',
                eventVersion: 1,
                occurredAt: new Date().toISOString(),
                payload: {
                    orderId: payload.orderId,
                    correlationId: payload.correlationId,
                    lines: toReserve.map((tr) => ({
                        sku: tr.sku,
                        quantity: tr.quantity,
                        nodeId: tr.nodeId,
                    })),
                },
            };

            await this.outboxRepository.save(
                {
                    id: successfulEvent.eventId,
                    eventType: successfulEvent.eventType,
                    eventVersion: successfulEvent.eventVersion,
                    status: OutboxStatus.PENDING,
                    payload: successfulEvent.payload as unknown as Record<string, unknown>,
                },
                queryRunner,
            );

            await queryRunner.commitTransaction();

            // Cache
            await this.store.set(
                corrKey,
                { success: true },
                this.configService.get('TTL_SECONDS', 86400),
            );
        } catch (error) {
            this.logger.error(
                `Unable to reserve inventory. CorrelationId (${payload.correlationId}). ${error}`,
            );

            if (queryRunner && queryRunner.isTransactionActive)
                await queryRunner.rollbackTransaction();

            // Check error type and write to failure outbox with failure reason
            let reason: string | undefined;

            if (
                error instanceof InsufficientInventoryException ||
                error instanceof ReservationAlreadyExistsException
            ) {
                reason = error.reason;
            }

            await this.writeFailureOutbox(payload, reason);
        } finally {
            if (queryRunner && !queryRunner.isReleased) await queryRunner.release();

            for (const lock of acquiredLocks.reverse()) {
                await this.inventoryLock.release(lock);
            }
        }
    }
}
