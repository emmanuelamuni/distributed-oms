import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';

import { SharedUtilsModule, AllExceptionFilter } from '@doms/shared/utils';
import { SharedRedisModule } from '@doms/shared/redis';
import { SharedKafkaModule } from '@doms/shared/kafka';
import { CreateOrderHandler, GetOrderHandler } from '@doms/order/application';
import { IDEMPOTENCY_STORE, IdempotencyStoreAdapter } from '@doms/shared/idempotency';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import {
    OutboxProcessor,
    OUTBOX_REPOSITORY,
    OUTBOX_PUBLISHER,
    OutboxPublisherAdapter,
} from '@doms/shared/outbox';

import {
    OrderTypeOrmEntity,
    OrderLineTypeOrmEntity,
    OrderOutboxTypeOrmEntity,
    OrderTypeOrmRepository,
    OrderOutboxTypeOrmRepository,
} from '@doms/order/infrastructure';

import { ORDER_REPOSITORY } from '@doms/order/domain';

@Module({
    imports: [
        SharedUtilsModule,
        SharedRedisModule,
        SharedKafkaModule.forRootAsync({ clientId: 'order-capture' }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                url: config.get('ORDER_DB_URL'),
                entities: [OrderTypeOrmEntity, OrderLineTypeOrmEntity, OrderOutboxTypeOrmEntity],
                synchronize: false,
            }),
        }),
        TypeOrmModule.forFeature([
            OrderTypeOrmEntity,
            OrderLineTypeOrmEntity,
            OrderOutboxTypeOrmEntity,
        ]),
        ScheduleModule.forRoot(),
        CqrsModule,
    ],
    providers: [
        OutboxProcessor,
        CreateOrderHandler,
        GetOrderHandler,

        { provide: APP_FILTER, useClass: AllExceptionFilter },

        { provide: ORDER_REPOSITORY, useClass: OrderTypeOrmRepository },
        { provide: OUTBOX_REPOSITORY, useClass: OrderOutboxTypeOrmRepository },
        { provide: OUTBOX_PUBLISHER, useClass: OutboxPublisherAdapter },
        { provide: IDEMPOTENCY_STORE, useClass: IdempotencyStoreAdapter },

        AppService,
    ],
    controllers: [AppController],
})
export class AppModule {}
