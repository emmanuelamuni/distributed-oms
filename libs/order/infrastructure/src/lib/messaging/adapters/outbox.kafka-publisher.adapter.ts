import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { IOutboxPublisherPort } from '@doms/shared/outbox';
import { KAFKA_CLIENT } from '@doms/shared/utils';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OutboxPublisherKafkaAdapter implements IOutboxPublisherPort {
    constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

    async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
        await firstValueFrom(this.client.emit(topic, payload));
    }
}
