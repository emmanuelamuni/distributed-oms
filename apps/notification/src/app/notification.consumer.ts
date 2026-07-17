import { OnModuleInit, OnModuleDestroy, Logger, Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload } from 'kafkajs';
import { createKafkaConsumer } from '@doms/shared/kafka';
// import { OrderConfirmedEventPayload, OrderCancelledEventPayload } from '@doms/shared/events';

@Injectable()
export class NotificationConsumer implements OnModuleInit, OnModuleDestroy {
    private consumer: Consumer;
    private readonly logger = new Logger(NotificationConsumer.name);

    constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

    /** Logic to apply to each message consumer receives */
    private async handleMessage({ topic, message }: EachMessagePayload): Promise<void> {
        if (!message.value) {
            this.logger.warn(`This topic (${topic}) has no message`);
            return;
        }

        try {
            const payload = JSON.parse(message.value.toString());

            switch (topic) {
                case 'order.confirmed':
                    this.logger.log(
                        `Order ${payload.orderId} confirmed. CorrelationId: ${payload.correlationId}`,
                    );
                    break;

                case 'order.cancelled':
                    this.logger.warn(
                        `Order ${payload.orderId} cancelled. CorrelationId: ${payload.correlationId}. Reason: ${payload?.reason}`,
                    );
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
        const clientId = this.config.get('NOTIFICATION_CLIENT_ID', 'notification');

        this.consumer = await createKafkaConsumer(
            {
                clientId,
                brokers: this.config.get('KAFKA_BROKERS').split(','),
                groupId: `doms.${clientId}`,
                topics: ['order.confirmed', 'order.cancelled'],
            },
            this.handleMessage.bind(this),
        );
    }

    async onModuleDestroy(): Promise<void> {
        await this.consumer.disconnect();
    }
}
