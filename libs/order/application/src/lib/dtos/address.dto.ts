import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AddressInput } from '../types/address.type';

export class AddressDto implements AddressInput {
    @ApiProperty({ type: String, example: '14 Old Town Street' })
    @IsString()
    @IsNotEmpty()
    street!: string;

    @ApiProperty({ type: String, example: 'Ajah' })
    @IsString()
    @IsNotEmpty()
    city!: string;

    @ApiProperty({ type: String, example: 'Lagos' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 15)
    state!: string;

    @ApiProperty({ type: String, example: '100101' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 10)
    postcode!: string;

    @ApiProperty({ type: String, example: 'NG' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 2)
    country!: string;
}
