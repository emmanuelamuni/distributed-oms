import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';

import { SharedUtilsModule } from '@doms/shared/utils';
import { SharedRedisModule } from '@doms/shared/redis';
import { SharedKafkaModule } from '@doms/shared/kafka';
import { IdempotencyInterceptor } from '@doms/shared/idempotency';
import { CreateOrderHandler, GetOrderHandler } from '@doms/order/application';

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
        IdempotencyInterceptor,
        CreateOrderHandler,
        GetOrderHandler,

        { provide: ORDER_REPOSITORY, useClass: OrderTypeOrmRepository },
        { provide: OUTBOX_REPOSITORY, useClass: OrderOutboxTypeOrmRepository },
        { provide: OUTBOX_PUBLISHER, useClass: OutboxPublisherAdapter },

        AppService,
    ],
    controllers: [AppController],
})
export class AppModule {}
