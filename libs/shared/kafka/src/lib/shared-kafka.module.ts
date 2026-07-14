import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { ClientsModule, Transport } from '@nestjs/microservices';
import { Producer, Kafka } from 'kafkajs';

export interface SharedKafkaModuleOptions {
    clientId: string;
}

export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER');

/**
 * Decided to go with manual kafka producer
 * Consumers can still use the simplified @EventPattern
 * Or a new consumer setup would be needed
 */
@Module({})
export class SharedKafkaModule {
    static forRootAsync(options: SharedKafkaModuleOptions): DynamicModule {
        return {
            module: SharedKafkaModule,
            // imports: [
            //     ClientsModule.registerAsync([
            //         {
            //             name: KAFKA_PRODUCER,
            //             inject: [ConfigService],
            //             useFactory: (config: ConfigService) => ({
            //                 transport: Transport.KAFKA,
            //                 options: {
            //                     client: {
            //                         clientId: options.clientId,
            //                         brokers: config.get('KAFKA_BROKERS').split(','),
            //                     },
            //                 },
            //             }),
            //         },
            //     ]),
            // ],
            providers: [
                {
                    provide: KAFKA_PRODUCER,
                    inject: [ConfigService],
                    useFactory: async (config: ConfigService): Promise<Producer> => {
                        const kafka = new Kafka({
                            clientId: options.clientId,
                            brokers: config.get('KAFKA_BROKERS').split(','),
                        });

                        const producer = kafka.producer();
                        await producer.connect();
                        return producer;
                    },
                },
            ],
            // exports: [ClientsModule],
            exports: [KAFKA_PRODUCER],
        };
    }
}
