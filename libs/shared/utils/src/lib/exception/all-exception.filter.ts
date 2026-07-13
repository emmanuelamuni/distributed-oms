import {
    ExceptionFilter,
    Catch,
    HttpException,
    HttpStatus,
    ArgumentsHost,
    Logger,
    Injectable,
} from '@nestjs/common';
import { Response } from 'express';

import { GlobalErrorRegistry } from '../registry/registry.util';

// Log and format well constructed response to client whenever error occurs.

@Injectable()
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();
        const { method, url } = request;

        /* eslint-disable @typescript-eslint/no-explicit-any */
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error: any = undefined;
        let stack: any = undefined;

        const customError = GlobalErrorRegistry.errorMappings.find(
            (ce) => exception instanceof ce.exception,
        );

        if (customError) {
            statusCode = customError.statusCode;
            message = (exception as Error).message;
        } else if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === 'object' ? (res as any).message : res;
            error = typeof res === 'object' ? (res as any).error : undefined;
        } else if (exception instanceof Error) {
            statusCode = HttpStatus.BAD_REQUEST;
            message = exception.message;
            stack = exception.stack;
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */

        const logData = {
            statusCode,
            message,
            error,
            request: { method, url },
            ...(stack && { stack }),
        };

        if (statusCode >= 500) {
            this.logger.error(logData);
        } else if (statusCode >= 400) {
            this.logger.warn(logData);
        } else {
            this.logger.log(logData);
        }

        response.status(statusCode).json({
            statusCode,
            message,
            error: HttpStatus[statusCode],
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
