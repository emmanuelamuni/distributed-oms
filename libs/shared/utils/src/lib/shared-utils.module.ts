import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from './config.schema';

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
    providers: [],
})
export class SharedUtilsModule {}
