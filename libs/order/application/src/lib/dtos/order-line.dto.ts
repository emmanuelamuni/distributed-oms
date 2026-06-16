import { IsString, IsNotEmpty, Length, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderLineInput } from '../types/order-line.type';

export class OrderLineDto implements OrderLineInput {
    @ApiProperty({ type: String, example: 'TOOL-0012' })
    @IsString()
    @IsNotEmpty()
    sku!: string;

    @ApiProperty({ type: Number, description: 'Non-negative Integer' })
    @IsInt()
    @Min(1)
    quantity!: number;

    @ApiProperty({ type: Number, example: 24.5 })
    @IsNumber()
    @Min(0)
    unitPrice!: number;

    @ApiProperty({ type: String, example: 'USD' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 3)
    currency!: string;
}
