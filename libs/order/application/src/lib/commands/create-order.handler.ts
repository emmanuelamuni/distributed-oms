import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateOrderCommand } from './create-order.command';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import { Order, Address, OrderLine, Money } from '@doms/order/domain';
import { ORDER_REPOSITORY, IOrderRepository } from '@doms/order/domain';
import { DataSource } from 'typeorm';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { ReserveInventoryCommand } from '@doms/shared/events';
import { OrderCreatedDomainEvent } from '@doms/order/domain';
import { randomUUID } from 'node:crypto';

/**
 * Handler class to create order, save, and write to outbox
 */

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
    private readonly logger = new Logger(CreateOrderHandler.name);

    constructor(
        @Inject(ConfigService)
        private readonly config: ConfigService,
        @Inject(IDEMPOTENCY_STORE)
        private readonly store: IIdempotencyStorePort,
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(DataSource)
        private readonly datasource: DataSource,
        @Inject(OUTBOX_REPOSITORY)
        private readonly outboxRepository: IOutboxRepositoryPort,
    ) {}

    async execute(command: CreateOrderCommand): Promise<OrderResponseDto> {
        // Retrun cached data based on correlationId
        const idempotencyKey = `${command.correlationId}:create-order`;
        const cached = await this.store.get(idempotencyKey);
        if (cached) return cached as OrderResponseDto;

        // Construct order aggregate
        const order = Order.create({
            customerId: command.customerId,
            channel: command.channel,
            shippingAddress: Address.create({
                street: command.shippingAddress.street,
                city: command.shippingAddress.city,
                state: command.shippingAddress.state,
                postcode: command.shippingAddress.postcode,
                country: command.shippingAddress.country,
            }),
            lines: command.lines.map((l) =>
                OrderLine.create({
                    sku: l.sku,
                    quantity: l.quantity,
                    unitPrice: Money.create(l.unitPrice, l.currency),
                }),
            ),
        });

        // Pull domain events
        const domainEvents = order.pullDomainEvents();

        // Open database connection
        const queryRunner = this.datasource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        // Save order aggregate and write outbox
        try {
            await this.orderRepository.save(order, queryRunner);

            for (const _event of domainEvents) {
                // Convert domain events appropriately
                const event = _event as OrderCreatedDomainEvent;

                const integrationEvent: ReserveInventoryCommand = {
                    eventId: event.eventId,
                    eventType: 'inventory.commands.reserve',
                    eventVersion: event.eventVersion,
                    occurredAt: event.occurredAt.toISOString(),
                    payload: {
                        orderId: event.aggregateId,
                        correlationId: command.correlationId,
                        lines: event.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
                    },
                };

                // Save the outbox for inventory reservation command
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

                // Save the outbox for order created (to be consumed by some services and integrations downstream)
                await this.outboxRepository.save(
                    {
                        id: randomUUID(),
                        eventType: 'order.created',
                        eventVersion: integrationEvent.eventVersion,
                        payload: integrationEvent.payload as unknown as Record<string, unknown>,
                        status: OutboxStatus.PENDING,
                    },
                    queryRunner,
                );
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }

            this.logger.error(
                `Error saving order for customer: ${command.customerId}. CorrelationId: ${command.correlationId}`,
                error instanceof Error ? error.stack : String(error),
            );

            throw error;
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release();
        }

        // Build response, cache, and return
        const response = OrderResponseDto.fromDomain(order, command.correlationId);

        await this.store.set(idempotencyKey, response, this.config.get('TTL_SECONDS', 86400));

        return response;
    }
}
