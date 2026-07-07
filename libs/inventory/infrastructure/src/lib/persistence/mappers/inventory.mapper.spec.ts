import { InventoryMapper } from './inventory.mapper';
import { InventoryNodeTypeOrmEntity } from '../entities/inventory-node.typeorm-entity';
import { InventoryReservationTypeOrmEntity } from '../entities/inventory-reservation.typeorm-entity';

const makeEntity = (): InventoryNodeTypeOrmEntity => {
    const entity = new InventoryNodeTypeOrmEntity();
    entity.id = 'node-agg-id';
    entity.sku = 'WIDGET-1234';
    entity.nodeId = 'node-001';
    entity.onHand = 100;
    entity.reserved = 10;
    entity.version = 1;
    entity.reservations = [];
    return entity;
};

const makeReservation = (): InventoryReservationTypeOrmEntity => {
    const r = new InventoryReservationTypeOrmEntity();
    r.reservationId = 'res-id-001';
    r.sku = 'WIDGET-1234';
    r.orderId = 'order-001';
    r.quantity = 5;
    return r;
};

describe('InventoryMapper', () => {
    describe('toDomain', () => {
        it('should map entity fields to domain aggregate', () => {
            const domain = InventoryMapper.toDomain(makeEntity());

            expect(domain.id).toBe('node-agg-id');
            expect(domain.sku).toBe('WIDGET-1234');
            expect(domain.nodeId).toBe('node-001');
            expect(domain.onHand.value).toBe(100);
            expect(domain.reserved.value).toBe(10);
            expect(domain.available.value).toBe(90);
        });

        it('should map reservations correctly', () => {
            const entity = makeEntity();
            entity.reservations = [makeReservation()];

            const domain = InventoryMapper.toDomain(entity);

            expect(domain.reservations).toHaveLength(1);
            expect(domain.reservations[0].reservationId).toBe('res-id-001');
            expect(domain.reservations[0].sku).toBe('WIDGET-1234');
            expect(domain.reservations[0].orderId).toBe('order-001');
            expect(domain.reservations[0].quantity).toBe(5);
        });

        it('should handle missing reservations gracefully', () => {
            const entity = makeEntity();
            /* eslint-disable @typescript-eslint/no-explicit-any */
            entity.reservations = undefined as any;

            const domain = InventoryMapper.toDomain(entity);

            expect(domain.reservations).toHaveLength(0);
        });
    });

    describe('toPersistence', () => {
        it('should map domain aggregate to entity', () => {
            const domain = InventoryMapper.toDomain(makeEntity());
            const entity = InventoryMapper.toPersistence(domain);

            expect(entity.id).toBe('node-agg-id');
            expect(entity.sku).toBe('WIDGET-1234');
            expect(entity.nodeId).toBe('node-001');
            expect(entity.onHand).toBe(100);
            expect(entity.reserved).toBe(10);
        });

        it('should map reservations back to persistence entities', () => {
            const entity = makeEntity();
            entity.reservations = [makeReservation()];

            const domain = InventoryMapper.toDomain(entity);
            const restored = InventoryMapper.toPersistence(domain);

            expect(restored.reservations).toHaveLength(1);
            expect(restored.reservations[0].reservationId).toBe('res-id-001');
            expect(restored.reservations[0].quantity).toBe(5);
        });

        it('should round-trip without data loss', () => {
            const original = makeEntity();
            original.reservations = [makeReservation()];

            const domain = InventoryMapper.toDomain(original);
            const restored = InventoryMapper.toPersistence(domain);

            expect(restored.sku).toBe(original.sku);
            expect(restored.onHand).toBe(original.onHand);
            expect(restored.reserved).toBe(original.reserved);
            expect(restored.reservations).toHaveLength(1);
        });
    });
});
