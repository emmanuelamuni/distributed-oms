import {
    Controller,
    Get,
    Post,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Body,
    ValidationPipe,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
    OrderResponseDto,
    CreateOrderDto,
    CreateOrderCommand,
    GetOrderQuery,
} from '@doms/order/application';

import { CorrelationId } from '@doms/shared/idempotency';

import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(
        @Inject(QueryBus) private readonly queryBus: QueryBus,
        @Inject(CommandBus) private readonly commandBus: CommandBus,
        @Inject(AppService) private readonly appService: AppService,
    ) {}

    @Get()
    getData() {
        return this.appService.getData();
    }

    @Post('/orders')
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({ type: () => CreateOrderDto })
    @ApiResponse({ status: 201, type: () => OrderResponseDto })
    async create(
        @Body(ValidationPipe) dto: CreateOrderDto,
        @CorrelationId() correlationId: string,
    ): Promise<OrderResponseDto> {
        return await this.commandBus.execute(
            new CreateOrderCommand(
                dto.customerId,
                dto.channel,
                dto.shippingAddress,
                dto.lines,
                correlationId,
            ),
        );
    }

    @Get('/orders/:id')
    @ApiParam({ name: 'id', type: String })
    @ApiResponse({ status: 200, type: () => OrderResponseDto })
    async find(
        @Param('id', ParseUUIDPipe) id: string,
        @CorrelationId() correlationId: string,
    ): Promise<OrderResponseDto> {
        return await this.queryBus.execute(new GetOrderQuery(id, correlationId));
    }
}
