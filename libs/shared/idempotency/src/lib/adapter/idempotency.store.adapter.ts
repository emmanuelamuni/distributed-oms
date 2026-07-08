import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { IIdempotencyStorePort } from '../port/idempotency.store.port';

// Wired into root app since not wired in SharedIdempotencyModule
@Injectable()
export class IdempotencyStoreAdapter implements IIdempotencyStorePort {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    async get(key: string): Promise<unknown | null> {
        const data = await this.redis.get(key);

        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }

    async set(key: string, response: unknown, ttlSeconds: number): Promise<void> {
        const data = typeof response === 'string' ? response : JSON.stringify(response);
        await this.redis.set(key, data, 'EX', ttlSeconds);
    }

    async has(key: string): Promise<boolean> {
        return (await this.redis.exists(key)) > 0;
    }
}
