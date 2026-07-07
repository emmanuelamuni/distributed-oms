import { SKU, UniqueId } from '@doms/shared/kernel';
import { InventoryNode } from './inventory-node.aggregate';
import { Quantity } from '../value-objects/quantity.value-object';
// import { InventoryReservedDomainEvent } from '../events/inventory-reserved.domain-event';
// import { ReservationFailedDomainEvent } from '../events/reservation-failed.domain-event';

const makeInventoryNode = (onHand: number) =>
    InventoryNode.create({
        sku: SKU.create('WIDGET-1234').value,
        onHand: Quantity.create(onHand).value,
        nodeId: UniqueId.create().value,
    });

const reservationId = () => UniqueId.create().value;
const orderId = () => UniqueId.create().value;

describe('InventoryNode', () => {
    describe('reserve', () => {
        it('should reserve when sufficient stock exists', () => {
            const node = makeInventoryNode(10);
            node.reserve(reservationId(), orderId(), Quantity.create(2));

            expect(node.reserved.value).toBe(2);
            expect(node.available.value).toBe(8);
        });

        // it('should emit InventoryReservedDomainEvent if successfull', () => {
        //     const node = makeInventoryNode(10);
        //     node.reserve(reservationId(), orderId(), Quantity.create(2));
        //     const events = node.pullDomainEvents();

        //     expect(events[0]).toBeInstanceOf(InventoryReservedDomainEvent);
        // });

        it('should throw when requested exceeds available', () => {
            const node = makeInventoryNode(2);
            expect(() => node.reserve(reservationId(), orderId(), Quantity.create(5))).toThrow();
        });

        it('should throw on insufficient stock', () => {
            const node = makeInventoryNode(2);
            expect(() => node.reserve(reservationId(), orderId(), Quantity.create(5))).toThrow();
        });

        it('should not re-reserve on same reservationId', () => {
            const node = makeInventoryNode(10);
            const rid = reservationId();
            const oid = orderId();

            node.reserve(rid, oid, Quantity.create(3));
            node.pullDomainEvents();

            expect(() => node.reserve(rid, oid, Quantity.create(3))).toThrow();
            expect(node.reserved.value).toBe(3);
        });

        it('should record multiple reservations', () => {
            const node = makeInventoryNode(10);
            node.reserve(reservationId(), orderId(), Quantity.create(3));
            node.reserve(reservationId(), orderId(), Quantity.create(4));

            expect(node.reserved.value).toBe(7);
            expect(node.available.value).toBe(3);
        });

        it('should fail when second reservation exceeds available', () => {
            const node = makeInventoryNode(4);
            node.reserve(reservationId(), orderId(), Quantity.create(3));

            expect(() => node.reserve(reservationId(), orderId(), Quantity.create(3))).toThrow();
        });
    });

    describe('releaseReservation', () => {
        it('should release a reservation and restore available', () => {
            const node = makeInventoryNode(10);
            const rid = reservationId();

            node.reserve(rid, orderId(), Quantity.create(4));
            node.pullDomainEvents();

            node.releaseReservation(rid);

            expect(node.reserved.value).toBe(0);
            expect(node.available.value).toBe(10);
        });

        it('should throw for unknown reservationId', () => {
            const node = makeInventoryNode(10);
            expect(() => node.releaseReservation(reservationId())).toThrow();
        });

        it('should allow re-reservation after release', () => {
            const node = makeInventoryNode(5);
            const rid = reservationId();

            node.reserve(rid, orderId(), Quantity.create(4));
            node.pullDomainEvents();
            node.releaseReservation(rid);
            node.reserve(rid, orderId(), Quantity.create(5));

            expect(node.available.value).toBe(0);
        });
    });

    describe('available property', () => {
        it('should equal onHand when nothing is reserved', () => {
            expect(makeInventoryNode(10).available.value).toBe(10);
        });
    });
});
