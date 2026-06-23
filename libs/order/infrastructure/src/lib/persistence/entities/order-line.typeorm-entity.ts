import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('order_lines')
export class OrderLineTypeOrmEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    sku!: string;

    @Column({ type: 'int' })
    quantity!: number;

    @Column({ name: 'unit_price', type: 'varchar' })
    unitPrice!: string;

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ name: 'line_total', type: 'varchar' })
    lineTotal!: string;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    @ManyToOne(
        () => require('./order.typeorm-entity').OrderTypeOrmEntity,
        (_orderId: any) => _orderId.lines,
        { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    )
    @JoinColumn({ name: 'order_id' })
    orderId!: any;
}
