import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_CLIENT } from '@doms/shared/utils';
import { IInventoryCommandPublisher } from '@doms/order/domain';
import { ReserveInventoryCommandPayload } from '@doms/shared/events';
import { firstValueFrom } from 'rxjs';

/**
 * Called by saga implementation logic onOrderCreatd.
 * Uses the kafka client provided directly, unlike outbox that uses an adapter version.
 */
@Injectable()
export class InventoryCommandKafkaPublisher implements IInventoryCommandPublisher {
    private readonly logger = new Logger(InventoryCommandKafkaPublisher.name);

    constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

    async publish(payload: ReserveInventoryCommandPayload): Promise<void> {
        try {
            await firstValueFrom(this.client.emit('inventory.commands.reserve', payload));
        } catch (error) {
            this.logger.error(`Failed to publish 'inventory.commands.reserve'`, error);
            throw error;
        }
    }
}
