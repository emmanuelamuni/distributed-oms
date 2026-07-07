import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { IInventoryLockPort } from '@doms/inventory/domain';

@Injectable()
export class RedisInventoryLockAdapter implements IInventoryLockPort {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    async acquire(key: string, ttlMs: number): Promise<boolean> {
        const result = await this.redis.set(key, '1', 'EX', Math.ceil(ttlMs / 1000), 'NX');
        return result === 'OK';
    }

    async release(key: string): Promise<void> {
        await this.redis.del(key);
    }
}
