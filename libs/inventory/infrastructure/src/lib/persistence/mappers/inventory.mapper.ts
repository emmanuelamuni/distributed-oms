import { InventoryNode, Quantity } from '@doms/inventory/domain';
import { InventoryNodeTypeOrmEntity } from '../entities/inventory-node.typeorm-entity';
import { InventoryReservationTypeOrmEntity } from '../entities/inventory-reservation.typeorm-entity';

export class InventoryMapper {
    static toDomain(raw: InventoryNodeTypeOrmEntity): InventoryNode {
        return InventoryNode.reconstitute(
            {
                sku: raw.sku,
                nodeId: raw.nodeId,
                onHand: Quantity.fromRaw(raw.onHand),
                reserved: Quantity.fromRaw(raw.reserved),
                reservations: (raw.reservations || []).map((r) => ({
                    sku: r.sku,
                    orderId: r.orderId,
                    quantity: r.quantity,
                    reservationId: r.reservationId,
                })),
            },
            raw.id,
        );
    }

    static toPersistence(domain: InventoryNode): InventoryNodeTypeOrmEntity {
        const entity = new InventoryNodeTypeOrmEntity();

        entity.id = domain.id;
        entity.sku = domain.sku;
        entity.nodeId = domain.nodeId;
        entity.onHand = domain.onHand.value;
        entity.reserved = domain.reserved.value;
        entity.reservations = domain.reservations.map((r) => {
            const _entity = new InventoryReservationTypeOrmEntity();

            _entity.reservationId = r.reservationId;
            _entity.sku = r.sku;
            _entity.orderId = r.orderId;
            _entity.quantity = r.quantity;

            return _entity;
        });

        return entity;
    }
}
