import { UniqueId } from '@doms/shared/kernel';
import { Order, OrderLine, OrderStatus, Address, Money } from '@doms/order/domain';
import { OrderTypeOrmEntity } from '../entities/order.typeorm-entity';
import { OrderLineTypeOrmEntity } from '../entities/order-line.typeorm-entity';

export class OrderMapper {
    static toDomain(raw: OrderTypeOrmEntity): Order {
        return Order.reconstitute(
            {
                customerId: UniqueId.fromExisting(raw.customerId).value,
                status: OrderStatus.create(raw.status),
                shippingAddress: Address.create({
                    street: raw.street,
                    city: raw.city,
                    state: raw.state,
                    postcode: raw.postcode,
                    country: raw.country,
                }),
                channel: raw.channel,
                totalAmount: Money.create(Number(raw.totalAmount), raw.currency),
                version: raw.version,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
                lines: raw.lines.map((line) => OrderMapper.toDomainLine(line)),
            },
            UniqueId.fromExisting(raw.id).value,
        );
    }

    static toPersistence(domain: Order): OrderTypeOrmEntity {
        const entity = new OrderTypeOrmEntity();
        entity.id = domain.id;
        entity.customerId = domain.customerId;
        entity.status = domain.status.value;
        entity.channel = domain.channel;
        entity.totalAmount = domain.totalAmount.amount.toString();
        entity.currency = domain.totalAmount.currency;
        entity.street = domain.shippingAddress.street;
        entity.city = domain.shippingAddress.city;
        entity.state = domain.shippingAddress.state;
        entity.postcode = domain.shippingAddress.postcode;
        entity.country = domain.shippingAddress.country;
        entity.lines = domain.lines.map((line) => OrderMapper.toPersistenceLine(line));
        return entity;
    }

    private static toDomainLine(rawLine: OrderLineTypeOrmEntity): OrderLine {
        return OrderLine.reconstitute(
            {
                sku: rawLine.sku,
                quantity: rawLine.quantity,
                unitPrice: Money.create(Number(rawLine.unitPrice), rawLine.currency),
            },
            UniqueId.fromExisting(rawLine.id).value,
        );
    }

    private static toPersistenceLine(domainLine: OrderLine): OrderLineTypeOrmEntity {
        const entity = new OrderLineTypeOrmEntity();
        entity.id = domainLine.id;
        entity.sku = domainLine.sku;
        entity.quantity = domainLine.quantity;
        entity.unitPrice = domainLine.unitPrice.amount.toString();
        entity.currency = domainLine.lineTotal().currency;
        entity.lineTotal = domainLine.lineTotal().amount.toString();
        return entity;
    }
}
