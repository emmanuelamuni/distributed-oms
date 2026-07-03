import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('inventory_reservations')
export class InventoryReservationTypeOrmEntity {
    @PrimaryColumn('uuid')
    reservationId!: string;

    @Column({ type: 'varchar' })
    sku!: string;

    @Column({ type: 'int' })
    quantity!: number;

    @Column({ type: 'varchar' })
    orderId!: string;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    @ManyToOne(
        () => require('./inventory-node.typeorm-entity').InventoryNodeTypeOrmEntity,
        (_inventoryNodeId: any) => _inventoryNodeId.reservations,
        { onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    )
    @JoinColumn({ name: 'inventory_node_id' })
    inventoryNodeId!: string;
}
