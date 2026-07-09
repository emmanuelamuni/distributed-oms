import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from './config.schema';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            load: [
                () => {
                    return parseEnv();
                },
            ],
        }),
    ],
    exports: [ConfigModule],
})
export class SharedUtilsModule {}
