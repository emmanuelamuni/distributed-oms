import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { SharedUtilsModule, AllExceptionFilter } from '@doms/shared/utils';

import { NotificationConsumer } from './notification.consumer';

@Module({
    imports: [SharedUtilsModule],
    providers: [NotificationConsumer, { provide: APP_FILTER, useClass: AllExceptionFilter }],
})
export class AppModule {}
