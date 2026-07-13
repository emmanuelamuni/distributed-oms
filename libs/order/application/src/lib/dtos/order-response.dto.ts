import { ApiProperty } from '@nestjs/swagger';
import { OrderStatusEnum, Order } from '@doms/order/domain';
import { AddressDto } from './address.dto';

export class OrderLineResponseDto {
    @ApiProperty({ type: String }) sku!: string;
    @ApiProperty({ type: Number }) quantity!: number;
    @ApiProperty({ type: Number }) unitPrice!: number;
    @ApiProperty({ type: Number }) lineTotal!: number;
    @ApiProperty({ type: String }) currency!: string;
}

export class OrderResponseDto {
    @ApiProperty({ type: String }) orderId!: string;
    @ApiProperty({ enum: OrderStatusEnum }) status!: OrderStatusEnum;
    @ApiProperty({ type: String }) customerId!: string;
    @ApiProperty({ type: String }) channel!: string;
    @ApiProperty({ type: Number }) totalAmount!: number;
    @ApiProperty({ type: String }) currency!: string;
    @ApiProperty({ type: () => AddressDto }) shippingAddress!: AddressDto;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
    @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
    @ApiProperty({ type: () => [OrderLineResponseDto] }) lines!: OrderLineResponseDto[];

    static fromDomain(order: Order): OrderResponseDto {
        const response: OrderResponseDto = {
            orderId: order.id,
            status: order.status.value,
            customerId: order.customerId,
            channel: order.channel,
            totalAmount: order.totalAmount.amount,
            currency: order.totalAmount.currency,
            lines: order.lines.map((l) => ({
                sku: l.sku,
                quantity: l.quantity,
                unitPrice: l.unitPrice.amount,
                lineTotal: l.lineTotal().amount,
                currency: l.lineTotal().currency,
            })),
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };

        return response;
    }
}
