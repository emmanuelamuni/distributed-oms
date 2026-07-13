import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryAndOutboxTables1783938332919 implements MigrationInterface {
    name = 'CreateInventoryAndOutboxTables1783938332919';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."inventory_outboxes_status_enum" AS ENUM('PENDING', 'PUBLISHED', 'FAILED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "inventory_outboxes" ("id" uuid NOT NULL, "event_type" character varying NOT NULL, "event_version" integer NOT NULL DEFAULT '1', "payload" jsonb NOT NULL, "status" "public"."inventory_outboxes_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "published_at" TIMESTAMP, "retry_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_554ef06588062f55f08935f3e9c" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "inventory_nodes" ("id" uuid NOT NULL, "sku" character varying NOT NULL, "node_id" character varying NOT NULL, "on_hand" integer NOT NULL, "reserved" integer NOT NULL, "version" integer NOT NULL, CONSTRAINT "PK_7176713ac353d0ac3fc9116ca0f" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_d998bc205fc9336a23b12cf8a5" ON "inventory_nodes"  ("sku", "node_id") `,
        );
        await queryRunner.query(
            `CREATE TABLE "inventory_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservation_id" uuid NOT NULL, "sku" character varying NOT NULL, "quantity" integer NOT NULL, "order_id" uuid NOT NULL, "inventory_node_id" uuid, CONSTRAINT "PK_af438c0ce596eea6c4d472a0489" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "inventory_reservations" ADD CONSTRAINT "FK_b7a7d5c985b3a068197ffe03f14" FOREIGN KEY ("inventory_node_id") REFERENCES "inventory_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "inventory_reservations" DROP CONSTRAINT "FK_b7a7d5c985b3a068197ffe03f14"`,
        );
        await queryRunner.query(`DROP TABLE "inventory_reservations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d998bc205fc9336a23b12cf8a5"`);
        await queryRunner.query(`DROP TABLE "inventory_nodes"`);
        await queryRunner.query(`DROP TABLE "inventory_outboxes"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_outboxes_status_enum"`);
    }
}
