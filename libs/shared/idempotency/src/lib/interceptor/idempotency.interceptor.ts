import {
    Injectable,
    Inject,
    CallHandler,
    ExecutionContext,
    NestInterceptor,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, of, tap } from 'rxjs';
import { IDEMPOTENCY_STORE, IIdempotencyStorePort } from '../port/idempotency.store.port';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    private readonly logger = new Logger(IdempotencyInterceptor.name);

    constructor(
        @Inject(ConfigService) private readonly config: ConfigService,
        @Inject(IDEMPOTENCY_STORE) private readonly store: IIdempotencyStorePort,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest();

        const key = request.headers[IDEMPOTENCY_KEY_HEADER];
        if (!key)
            throw new HttpException('Idempotency-Key header is required', HttpStatus.BAD_REQUEST);

        request.correlationId = key;

        const cached = await this.store.get(key);
        if (cached) {
            this.logger.log(`Idempotency hit for key: ${key}`);
            return of(cached);
        }

        const ttlSeconds = this.config.get('TTL_SECONDS', 86400);
        return next.handle().pipe(
            tap(async (response) => {
                await this.store.set(key, response, ttlSeconds);
            }),
        );
    }
}
