/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();

// apps/order-capture
// app.module.ts wires:

// - HTTP controller
// HTTP controller exposes:
// - POST /orders — applies IdempotencyInterceptor, maps body to CreateOrderDto, dispatches CreateOrderCommand, returns OrderResponseDto
// - GET /orders/:id — dispatches GetOrderQuery, returns OrderResponseDto
// main.ts:
// - Creates NestJS app
// - Enables validation pipe (class-validator)
// - Sets global prefix /api/v1
// - Listens on configurable port (from env)
