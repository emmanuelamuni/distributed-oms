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

/**
 * Mapper in infrastructure would translate domain events to shared events structure
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
        const cached = await this.store.get(command.correlationId);
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

            for (const event of domainEvents) {
                await this.outboxRepository.save(
                    {
                        eventType: event.eventType,
                        status: OutboxStatus.PENDING,
                        payload: event as unknown as Record<string, unknown>,
                    },
                    queryRunner,
                );
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }

            throw error;
        } finally {
            if (!queryRunner.isReleased) {
                await queryRunner.release();
            }
        }

        // Build responce, cache, and return
        const responce: OrderResponseDto = {
            orderId: order.id,
            status: order.status.value,
            customerId: order.customerId,
            channel: order.channel,
            totalAmount: order.totalAmount.amount,
            currency: order.totalAmount.currency,
            lines: order.lines.map((l) => ({
                sku: l.sku,
                quantity: l.quantity,
                unitPrice: l.unitPrice.amount,
                lineTotal: l.lineTotal().amount,
                currency: l.lineTotal().currency,
            })),
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };

        await this.store.set(
            command.correlationId,
            responce,
            this.config.get('TTL_SECONDS', 86400),
        );

        return responce;
    }
}
