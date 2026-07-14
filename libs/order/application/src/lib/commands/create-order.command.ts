import { CommandBase } from '@doms/shared/kernel';
import { AddressInput } from '../types/address.type';
import { OrderLineInput } from '../types/order-line.type';

export class CreateOrderCommand extends CommandBase {
    constructor(
        public readonly customerId: string,
        public readonly channel: string,
        public readonly shippingAddress: AddressInput,
        public readonly lines: Array<OrderLineInput>,
    ) {
        super();
    }
}
