import { OnModuleInit, OnModuleDestroy, Logger, Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload } from 'kafkajs';
import { createKafkaConsumer } from '@doms/shared/kafka';
import { ReserveInventoryCommandPayload } from '@doms/shared/events';
import { ReserveInventoryCommand } from '@doms/inventory/application';

@Injectable()
export class InventoryConsumer implements OnModuleInit, OnModuleDestroy {
    private consumer: Consumer;
    private readonly logger = new Logger(InventoryConsumer.name);

    constructor(
        @Inject(CommandBus) private readonly commandBus: CommandBus,
        @Inject(ConfigService) private readonly config: ConfigService,
    ) {}

    /** Logic to apply to each message consumer receives */
    private async handleMessage({ topic, message }: EachMessagePayload): Promise<void> {
        if (!message.value) {
            this.logger.warn(`This topic (${topic}) has no message`);
            return;
        }

        try {
            const payload: ReserveInventoryCommandPayload = JSON.parse(message.value.toString());

            switch (topic) {
                case 'inventory.commands.reserve':
                    await this.commandBus.execute(new ReserveInventoryCommand(payload));
                    break;

                default:
                    this.logger.warn(`There is no consumer for this topic: ${topic}`);
            }
        } catch (error) {
            this.logger.error(`Error occured while handling topic ${topic}: ${error}`);
            // To be handled later in DLQ
        }
    }

    async onModuleInit(): Promise<void> {
        const clientId = this.config.get('INVENTORY_CLIENT_ID', 'inventory');

        this.consumer = await createKafkaConsumer(
            {
                clientId,
                brokers: this.config.get('KAFKA_BROKERS').split(','),
                groupId: `doms.${clientId}`,
                topics: ['inventory.commands.reserve'],
            },
            this.handleMessage.bind(this),
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.consumer.disconnect();
    }
}
