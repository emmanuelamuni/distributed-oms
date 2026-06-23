import {
    Entity,
    Column,
    PrimaryColumn,
    VersionColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { OrderStatusEnum } from '@doms/order/domain';

@Entity('orders')
export class OrderTypeOrmEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ name: 'customer_id', type: 'uuid' })
    customerId!: string;

    @Column({ type: 'enum', enum: OrderStatusEnum })
    status!: OrderStatusEnum;

    @Column({ type: 'varchar', length: 25 })
    channel!: string;

    @Column({ name: 'total_amount', type: 'varchar' })
    totalAmount!: string;

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ type: 'varchar' })
    street!: string;

    @Column({ type: 'varchar' })
    city!: string;

    @Column({ type: 'varchar' })
    state!: string;

    @Column({ type: 'varchar' })
    postcode!: string;

    @Column({ type: 'varchar', length: 2 })
    country!: string;

    @VersionColumn({ type: 'int' })
    version!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt!: Date;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    @OneToMany(
        () => require('./order-line.typeorm-entity').OrderLineTypeOrmEntity,
        (line: any) => line.orderId,
        { cascade: true },
    )
    lines!: any[];
}
