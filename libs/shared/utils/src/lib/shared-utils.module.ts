import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from './config.schema';
import { AllExceptionFilter } from './all-exception.filter';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [
                () => {
                    return parseEnv();
                },
            ],
        }),
    ],
    providers: [{ provide: APP_FILTER, useExisting: AllExceptionFilter }],
})
export class SharedUtilsModule {}
