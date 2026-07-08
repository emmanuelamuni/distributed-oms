export interface IIdempotencyStorePort {
    get(key: string): Promise<unknown | null>;
    set(key: string, response: unknown, ttlSeconds: number): Promise<void>;
    has(key: string): Promise<boolean>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
