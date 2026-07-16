import { AggregateRootBase, UniqueId, SKU } from '@doms/shared/kernel';
import { Quantity } from '../value-objects/quantity.value-object';
import { ReservationAlreadyExistsException } from '../exceptions/reservation-already-exists.exception';
import { InsufficientInventoryException } from '../exceptions/insufficient-inventory.exception';
// import { InventoryReservedDomainEvent } from '../events/inventory-reserved.domain-event';
import { ReservationNotFoundException } from '../exceptions/reservation-not-found.exception';

export interface ReservationRecord {
    sku: string;
    orderId: string;
    quantity: number;
    reservationId: string;
}

export interface InventoryNodeProps {
    sku: string;
    nodeId: string;
    version: number;
    onHand: Quantity;
    reserved: Quantity;
    reservations: ReservationRecord[];
}

export interface CreateInventoryNodeProps {
    sku: string;
    nodeId: string;
    onHand: number;
}

export class InventoryNode extends AggregateRootBase {
    private readonly props: InventoryNodeProps;

    constructor(props: InventoryNodeProps, id: string) {
        super(id);
        this.props = props;
    }

    static create(props: CreateInventoryNodeProps): InventoryNode {
        return new InventoryNode(
            {
                sku: SKU.create(props.sku).value,
                nodeId: UniqueId.fromExisting(props.nodeId).value,
                version: 1,
                onHand: Quantity.create(props.onHand),
                reserved: Quantity.zero(),
                reservations: [],
            },
            UniqueId.create().value,
        );
    }

    static reconstitute(props: InventoryNodeProps, id: string): InventoryNode {
        return new InventoryNode(props, id);
    }

    reserve(reservationId: string, orderId: string, quantity: Quantity): void {
        const alreadyExists = this.reservations.some((r) => r.reservationId === reservationId);

        if (alreadyExists) throw new ReservationAlreadyExistsException(reservationId);

        const available = this.available;

        if (quantity.isGreaterThan(available)) {
            throw new InsufficientInventoryException(
                this.sku,
                this.nodeId,
                quantity.value,
                available.value,
            );
        }

        // New reservation
        this.props.reserved = this.props.reserved.add(quantity);
        this.props.reservations.push({
            orderId,
            reservationId,
            sku: this.sku,
            quantity: quantity.value,
        });

        // this.apply(
        //     new InventoryReservedDomainEvent(
        //         reservationId,
        //         orderId,
        //         this.sku,
        //         this.nodeId,
        //         quantity.value,
        //     ),
        // );
    }

    releaseReservation(reservationId: string): void {
        const record = this.reservations.find((r) => r.reservationId === reservationId);

        if (!record) throw new ReservationNotFoundException(reservationId);

        this.props.reserved = this.props.reserved.subtract(Quantity.fromRaw(record.quantity));
        this.props.reservations = this.reservations.filter(
            (r) => r.reservationId !== reservationId,
        );
    }

    get sku(): string {
        return this.props.sku;
    }

    get nodeId(): string {
        return this.props.nodeId;
    }

    get version(): number {
        return this.props.version;
    }

    get onHand(): Quantity {
        return this.props.onHand;
    }

    get reserved(): Quantity {
        return this.props.reserved;
    }

    get reservations(): ReservationRecord[] {
        return [...this.props.reservations];
    }

    get available(): Quantity {
        return this.onHand.subtract(this.reserved);
    }
}
