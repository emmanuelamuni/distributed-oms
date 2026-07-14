import { Inject, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { ORDER_REPOSITORY, IOrderRepository, OrderNotFoundException } from '@doms/order/domain';
import { OrderResponseDto } from '../dtos/order-response.dto';
import { GetOrderQuery } from './get-order.query';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
    private readonly logger = new Logger(GetOrderHandler.name);

    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
    ) {}

    async execute(query: GetOrderQuery): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findById(query.orderId);

        if (!order) {
            this.logger.error(`Order was not found for (${query.orderId})`);
            throw new OrderNotFoundException(query.orderId);
        }

        return OrderResponseDto.fromDomain(order);
    }
}
