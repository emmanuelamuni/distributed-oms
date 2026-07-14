import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmOrderCommand } from './confirm-order.command';
import { Inject, Logger } from '@nestjs/common';
import { ORDER_REPOSITORY, IOrderRepository } from '@doms/order/domain';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import { DataSource } from 'typeorm';
import { OrderNotFoundException, Order } from '@doms/order/domain';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { ConfigService } from '@nestjs/config';
import { OrderConfirmedEvent } from '@doms/shared/events';
import { OrderConfirmedDomainEvent } from '@doms/order/domain';

@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderHandler implements ICommandHandler<ConfirmOrderCommand> {
    public readonly logger = new Logger(ConfirmOrderHandler.name);

    constructor(
        @Inject(DataSource)
        private readonly datasource: DataSource,
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(IDEMPOTENCY_STORE)
        private readonly idempotencyStore: IIdempotencyStorePort,
        @Inject(OUTBOX_REPOSITORY)
        private readonly outboxRepository: IOutboxRepositoryPort,
        @Inject(ConfigService)
        private readonly config: ConfigService,
    ) {}

    async execute(command: ConfirmOrderCommand): Promise<void> {
        const corrKey = `${command.correlationId}:confirm-order`;
        const cached = await this.idempotencyStore.get(corrKey);
        if (cached) return;

        let order: Order | null;

        const queryRunner = this.datasource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            order = await this.orderRepository.findById(command.orderId, queryRunner);
            if (!order) throw new OrderNotFoundException(command.orderId);

            order.confirm();
            const domainEvents = order.pullDomainEvents();
            await this.orderRepository.save(order, queryRunner);

            for (const _event of domainEvents) {
                // Convert domain events appropriately
                const event = _event as OrderConfirmedDomainEvent;

                const integrationEvent: OrderConfirmedEvent = {
                    eventId: event.eventId,
                    eventType: 'order.confirmed',
                    eventVersion: event.eventVersion,
                    occurredAt: event.occurredAt.toISOString(),
                    payload: {
                        orderId: event.aggregateId,
                        correlationId: command.correlationId,
                    },
                };

                await this.outboxRepository.save(
                    {
                        id: integrationEvent.eventId,
                        eventType: integrationEvent.eventType,
                        eventVersion: integrationEvent.eventVersion,
                        payload: integrationEvent.payload as unknown as Record<string, unknown>,
                        status: OutboxStatus.PENDING,
                    },
                    queryRunner,
                );
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();

            this.logger.error(
                `Error occured during order (${command.orderId}) confirmation`,
                error instanceof Error ? error.stack : String(error),
            );

            throw error;
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release();
        }

        await this.idempotencyStore.set(
            corrKey,
            { orderId: order.id, success: true },
            this.config.get('TTL_SECONDS', 86400),
        );
    }
}
