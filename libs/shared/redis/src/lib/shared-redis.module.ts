import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
    imports: [
        RedisModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'single',
                url: config.get('REDIS_URL'),
            }),
        }),
    ],
    exports: [RedisModule],
})
export class SharedRedisModule {}
