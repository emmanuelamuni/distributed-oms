import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';

import { SharedUtilsModule, AllExceptionFilter } from '@doms/shared/utils';
import { SharedRedisModule } from '@doms/shared/redis';
import { IDEMPOTENCY_STORE, IdempotencyStoreAdapter } from '@doms/shared/idempotency';
import { SharedKafkaModule } from '@doms/shared/kafka';

import {
    GetAvailabilityHandler,
    ReserveInventoryHandler,
    ReleaseReservationHandler,
} from '@doms/inventory/application';

import {
    OutboxProcessor,
    OUTBOX_REPOSITORY,
    OUTBOX_PUBLISHER,
    OutboxPublisherAdapter,
} from '@doms/shared/outbox';

import {
    InventoryNodeTypeOrmEntity,
    InventoryReservationTypeOrmEntity,
    InventoryOutboxTypeOrmEntity,
    InventoryTypeOrmRepository,
    InventoryOutboxTypeOrmRepository,
    RedisInventoryLockAdapter,
} from '@doms/inventory/infrastructure';

import { INVENTORY_LOCK, INVENTORY_REPOSITORY } from '@doms/inventory/domain';

import { InventoryConsumer } from './inventory.consumer';

@Module({
    imports: [
        SharedUtilsModule,
        SharedRedisModule,
        SharedKafkaModule.forRootAsync({ clientId: 'inventory' }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                url: config.get('INVENTORY_DB_URL'),
                entities: [
                    InventoryNodeTypeOrmEntity,
                    InventoryReservationTypeOrmEntity,
                    InventoryOutboxTypeOrmEntity,
                ],
                synchronize: false,
            }),
        }),
        TypeOrmModule.forFeature([
            InventoryNodeTypeOrmEntity,
            InventoryReservationTypeOrmEntity,
            InventoryOutboxTypeOrmEntity,
        ]),
        ScheduleModule.forRoot(),
        CqrsModule,
    ],
    providers: [
        GetAvailabilityHandler,
        ReserveInventoryHandler,
        ReleaseReservationHandler,
        OutboxProcessor,
        InventoryConsumer,

        { provide: APP_FILTER, useClass: AllExceptionFilter },

        { provide: INVENTORY_REPOSITORY, useClass: InventoryTypeOrmRepository },
        { provide: OUTBOX_REPOSITORY, useClass: InventoryOutboxTypeOrmRepository },
        { provide: OUTBOX_PUBLISHER, useClass: OutboxPublisherAdapter },
        { provide: IDEMPOTENCY_STORE, useClass: IdempotencyStoreAdapter },
        { provide: INVENTORY_LOCK, useClass: RedisInventoryLockAdapter },
    ],
})
export class AppModule {}
