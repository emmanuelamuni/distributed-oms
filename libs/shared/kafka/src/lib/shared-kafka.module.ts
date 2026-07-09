import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export interface SharedKafkaModuleOptions {
    clientId: string;
}

export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER');

@Module({})
export class SharedKafkaModule {
    static forRootAsync(options: SharedKafkaModuleOptions): DynamicModule {
        return {
            module: SharedKafkaModule,
            imports: [
                ClientsModule.registerAsync([
                    {
                        name: KAFKA_PRODUCER,
                        inject: [ConfigService],
                        useFactory: (config: ConfigService) => ({
                            transport: Transport.KAFKA,
                            options: {
                                client: {
                                    clientId: options.clientId,
                                    brokers: config.get('KAFKA_BROKERS').split(','),
                                },
                            },
                        }),
                    },
                ]),
            ],
            exports: [ClientsModule],
        };
    }
}
