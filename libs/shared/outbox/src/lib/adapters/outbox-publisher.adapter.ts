import { Injectable, Inject } from '@nestjs/common';
// import { ClientKafka } from '@nestjs/microservices';
import { Producer } from 'kafkajs';
// import { firstValueFrom } from 'rxjs';
import { KAFKA_PRODUCER } from '@doms/shared/kafka';
import { IOutboxPublisherPort } from '../ports/outbox.publisher.port';

@Injectable()
export class OutboxPublisherAdapter implements IOutboxPublisherPort {
    constructor(@Inject(KAFKA_PRODUCER) private readonly producer: Producer) {}

    async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
        await this.producer.send({
            topic,
            messages: [{ value: JSON.stringify(payload) }],
        });
        // await firstValueFrom(this.client.emit(topic, payload));
    }
}
