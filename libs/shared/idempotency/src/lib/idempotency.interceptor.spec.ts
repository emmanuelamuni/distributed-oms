import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IIdempotencyStorePort } from './idempotency.store.port';

const mockStore = (): jest.Mocked<IIdempotencyStorePort> => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
});

const mockConfig = (values: Record<string, unknown>): jest.Mocked<ConfigService> =>
    ({
        get: jest.fn((key: string) => values[key]),
    }) as unknown as jest.Mocked<ConfigService>;

const mockExecutionContext = (headers: Record<string, string>): ExecutionContext =>
    ({
        switchToHttp: () => ({
            getRequest: () => ({ headers }),
        }),
    }) as unknown as ExecutionContext;

const mockCallHandler = (response: unknown) => ({
    handle: () => of(response),
});

describe('IdempotencyInterceptor', () => {
    let config: jest.Mocked<ConfigService>;
    let store: jest.Mocked<IIdempotencyStorePort>;
    let interceptor: IdempotencyInterceptor;

    beforeEach(() => {
        store = mockStore();
        config = mockConfig({ TTL_SECONDS: 86400 });
        interceptor = new IdempotencyInterceptor(config, store);
    });

    describe('when Idempotency-Key header is missing', () => {
        it('should throw a 400 BadRequest', async () => {
            const context = mockExecutionContext({});
            const handler = mockCallHandler({ orderId: 'abc' });

            await expect(interceptor.intercept(context, handler)).rejects.toThrow(
                new HttpException('Idempotency-Key header is required', HttpStatus.BAD_REQUEST),
            );
        });

        it('should not call the store', async () => {
            const context = mockExecutionContext({});
            const handler = mockCallHandler({});

            await interceptor.intercept(context, handler).catch(() => null);

            expect(store.get).not.toHaveBeenCalled();
            expect(store.set).not.toHaveBeenCalled();
        });
    });

    describe('when a cached response exists for the key', () => {
        it('should return the cached response without calling the handler', async () => {
            const cachedResponse = { orderId: 'cached-order-123', status: 'DRAFT' };
            store.get.mockResolvedValue(cachedResponse);

            const context = mockExecutionContext({ 'idempotency-key': 'key-abc' });
            const handler = mockCallHandler({ orderId: 'new-order' });

            const result$ = await interceptor.intercept(context, handler);

            await new Promise<void>((resolve) => {
                result$.subscribe((value) => {
                    expect(value).toEqual(cachedResponse);
                    resolve();
                });
            });
        });

        it('should not write to the store again on a cache hit', async () => {
            store.get.mockResolvedValue({ orderId: 'existing' });

            const context = mockExecutionContext({ 'idempotency-key': 'key-abc' });
            const handler = mockCallHandler({});

            await interceptor.intercept(context, handler);

            expect(store.set).not.toHaveBeenCalled();
        });
    });

    describe('when no cached response exists', () => {
        it('should call the handler and return its response', async () => {
            store.get.mockResolvedValue(null);
            store.set.mockResolvedValue(undefined);

            const freshResponse = { orderId: 'new-order-456', status: 'DRAFT' };
            const context = mockExecutionContext({ 'idempotency-key': 'key-xyz' });
            const handler = mockCallHandler(freshResponse);

            const result$ = await interceptor.intercept(context, handler);

            await new Promise<void>((resolve) => {
                result$.subscribe((value) => {
                    expect(value).toEqual(freshResponse);
                    resolve();
                });
            });
        });

        it('should store the response after the handler resolves', async () => {
            store.get.mockResolvedValue(null);
            store.set.mockResolvedValue(undefined);

            const freshResponse = { orderId: 'new-order-456', status: 'DRAFT' };
            const context = mockExecutionContext({ 'idempotency-key': 'key-xyz' });
            const handler = mockCallHandler(freshResponse);

            const result$ = await interceptor.intercept(context, handler);

            await new Promise<void>((resolve) => {
                result$.subscribe({
                    complete: () => {
                        expect(store.set).toHaveBeenCalledWith('key-xyz', freshResponse, 86_400);
                        resolve();
                    },
                });
            });
        });

        it('should call store.get with the exact key from the header', async () => {
            store.get.mockResolvedValue(null);
            store.set.mockResolvedValue(undefined);

            const context = mockExecutionContext({ 'idempotency-key': 'my-exact-key' });
            const handler = mockCallHandler({});

            await interceptor.intercept(context, handler);

            expect(store.get).toHaveBeenCalledWith('my-exact-key');
        });
    });
});
