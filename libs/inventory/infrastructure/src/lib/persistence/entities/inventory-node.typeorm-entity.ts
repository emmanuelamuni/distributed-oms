import { Entity, PrimaryColumn, Column, Index, OneToMany, VersionColumn } from 'typeorm';

// SKU and Node ID must have composite uniqueness
@Index(['sku', 'nodeId'], { unique: true })
@Entity('inventory_nodes')
export class InventoryNodeTypeOrmEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    sku!: string;

    @Column({ name: 'node_id', type: 'varchar' })
    nodeId!: string;

    @Column({ name: 'on_hand', type: 'int' })
    onHand!: number;

    @Column({ type: 'int' })
    reserved!: number;

    @VersionColumn({ type: 'int' })
    version!: number;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    @OneToMany(
        () => require('./inventory-reservation.typeorm-entity').InventoryReservationTypeOrmEntity,
        (reservation: any) => reservation.inventoryNodeId,
        { cascade: true, orphanedRowAction: 'delete' },
    )
    reservations!: any[];
}
