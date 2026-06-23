import { EntityBase, UniqueId, SKU } from '@doms/shared/kernel';
import { Money } from '../value-objects/money.vo';

export interface OrderLineProps {
    sku: string;
    quantity: number;
    unitPrice: Money;
}

export class OrderLine extends EntityBase<OrderLineProps> {
    private constructor(props: OrderLineProps, id: string) {
        super(props, id);
    }

    public static create(props: OrderLineProps): OrderLine {
        if (!Number.isInteger(props.quantity) || props.quantity < 1) {
            throw new Error(
                `Order line quantity must be a positive integer. Got: ${props.quantity}`,
            );
        }

        return new OrderLine(
            {
                sku: SKU.create(props.sku).value,
                quantity: props.quantity,
                unitPrice: props.unitPrice,
            },
            UniqueId.create().value,
        );
    }

    public static reconstitute(props: OrderLineProps, id: string): OrderLine {
        return new OrderLine(props, id);
    }

    public lineTotal(): Money {
        return this.unitPrice.multiply(this.quantity);
    }

    get sku(): string {
        return this.props.sku;
    }

    get quantity(): number {
        return this.props.quantity;
    }

    get unitPrice(): Money {
        return this.props.unitPrice;
    }
}
