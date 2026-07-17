import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { config } from 'dotenv';

import { baseLogger } from '@doms/shared/utils';
import { AppModule } from './app/app.module';

config();

async function bootstrap() {
    const winstonLogger = WinstonModule.createLogger({ instance: baseLogger });
    const app = await NestFactory.create(AppModule, { logger: winstonLogger, bufferLogs: true });

    // const app = await NestFactory.create(AppModule);

    const logger = new Logger('Notification');
    const config = app.get(ConfigService);
    const globalPrefix = config.get('GLOBAL_PREFIX');
    const port = config.get('NOTIFICATION_PORT', 3004);

    // Setup validation pipe

    app.setGlobalPrefix(globalPrefix);

    await app.listen(port);

    logger.log(`Notification is running on: http://localhost:${port}/${globalPrefix}`);
    console.log(`Notification is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
