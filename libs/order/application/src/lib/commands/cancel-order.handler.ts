import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelOrderCommand } from './cancel-order.command';
import { Inject, Logger } from '@nestjs/common';
import { ORDER_REPOSITORY, IOrderRepository } from '@doms/order/domain';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '@doms/shared/idempotency';
import { DataSource } from 'typeorm';
import { OrderNotFoundException, Order } from '@doms/order/domain';
import { OUTBOX_REPOSITORY, IOutboxRepositoryPort, OutboxStatus } from '@doms/shared/outbox';
import { ConfigService } from '@nestjs/config';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
    public readonly logger = new Logger(CancelOrderHandler.name);

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

    async execute(command: CancelOrderCommand): Promise<OrderResponseDto> {
        const cached = await this.idempotencyStore.get(command.correlationId);
        if (cached) return cached as OrderResponseDto;

        let order: Order | null;

        const queryRunner = this.datasource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            order = await this.orderRepository.findById(command.orderId, queryRunner);
            if (!order) throw new OrderNotFoundException(command.orderId);

            order.cancel(command.reason);
            const events = order.pullDomainEvents();
            await this.orderRepository.save(order, queryRunner);

            for (const event of events) {
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
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();

            this.logger.error(
                `Error occured during order (${command.orderId}) cancellation`,
                error instanceof Error ? error.stack : String(error),
            );

            throw error;
        } finally {
            if (!queryRunner.isReleased) await queryRunner.release();
        }

        // Build response, cache, and return
        const response = OrderResponseDto.fromDomain(order, command.correlationId);

        await this.idempotencyStore.set(
            command.correlationId,
            response,
            this.config.get('TTL_SECONDS', 86400),
        );

        return response;
    }
}
