import { AggregateRootBase, UniqueId } from '@doms/shared/kernel';
import { OrderLine } from '../entities/order-line.entity';
import { OrderStatus, OrderStatusEnum } from '../value-objects/order-status.vo';
import { Address } from '../value-objects/address.vo';
import { Money } from '../value-objects/money.vo';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderStateMachine } from './order.state-machine';
import { InvalidOrderTransitionException } from '../exceptions/invalid-order-transition.exception';
import { OrderConfirmedEvent } from '../events/order-confirmed.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { InventoryAllocatedEvent } from '../events/inventory-allocated.event';

export interface OrderProps {
    customerId: string;
    status: OrderStatus;
    shippingAddress: Address;
    channel: string;
    totalAmount: Money;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    lines: Array<OrderLine>;
}

export interface CreateOrderProps {
    customerId: string;
    shippingAddress: Address;
    channel: string;
    lines: Array<OrderLine>;
}

export class Order extends AggregateRootBase {
    public readonly props: OrderProps;

    private constructor(props: OrderProps, id: string) {
        super(id);
        this.props = props;
    }

    static create(props: CreateOrderProps): Order {
        if (props.lines.length < 1) {
            throw new Error(`A line order must be present. Got: ${props.lines.length}`);
        }

        const currency = props.lines[0].unitPrice.currency;
        let totalAmount = 0;

        props.lines.forEach((line) => {
            if (line.unitPrice.currency !== currency) {
                throw new Error(`All order lines must have same currency`);
            }

            totalAmount += line.lineTotal().amount;
        });

        if (totalAmount < 0) {
            throw new Error(`Total order value must be non-negative. Got: ${totalAmount}`);
        }

        const order = new Order(
            {
                customerId: UniqueId.fromExisting(props.customerId).value,
                status: OrderStatus.create(OrderStatusEnum.DRAFT),
                shippingAddress: props.shippingAddress,
                channel: props.channel,
                totalAmount: Money.create(totalAmount, currency),
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
                lines: props.lines,
            },
            UniqueId.create().value,
        );

        order.apply(
            new OrderCreatedEvent(
                order.id,
                order.props.customerId,
                order.props.shippingAddress,
                order.props.channel,
                order.props.totalAmount,
                order.props.lines,
            ),
        );

        return order;
    }

    static reconstitute(props: OrderProps, id: string): Order {
        return new Order(props, id);
    }

    confirm(): void {
        const toStatus = OrderStatusEnum.CONFIRMED;

        if (!OrderStateMachine.canTransition(this.status.value, toStatus)) {
            throw new InvalidOrderTransitionException(this.status.value, toStatus, this.id);
        }

        this.props.status = OrderStatus.create(toStatus);
        this.props.updatedAt = new Date();
        this.apply(new OrderConfirmedEvent(this.id));
    }

    cancel(reason: string): void {
        const toStatus = OrderStatusEnum.CANCELLED;

        if (!OrderStateMachine.canTransition(this.status.value, toStatus)) {
            throw new InvalidOrderTransitionException(this.props.status.value, toStatus, this.id);
        }

        this.props.status = OrderStatus.create(toStatus);
        this.props.updatedAt = new Date();
        this.apply(new OrderCancelledEvent(this.id, reason));
    }

    allocate(reservationId: string): void {
        const toStatus = OrderStatusEnum.ALLOCATED;

        if (!OrderStateMachine.canTransition(this.status.value, toStatus)) {
            throw new InvalidOrderTransitionException(this.status.value, toStatus, this.id);
        }

        this.props.status = OrderStatus.create(OrderStatusEnum.ALLOCATED);
        this.props.updatedAt = new Date();
        this.apply(new InventoryAllocatedEvent(this.id, reservationId));
    }

    get customerId(): string {
        return this.props.customerId;
    }
    get status(): OrderStatus {
        return this.props.status;
    }
    get shippingAddress(): Address {
        return this.props.shippingAddress;
    }
    get channel(): string {
        return this.props.channel;
    }
    get totalAmount(): Money {
        return this.props.totalAmount;
    }
    get createdAt(): Date {
        return this.props.createdAt;
    }
    get updatedAt(): Date {
        return this.props.updatedAt;
    }
    get version(): number {
        return this.props.version;
    }
    get lines(): Array<OrderLine> {
        return this.props.lines;
    }
}
