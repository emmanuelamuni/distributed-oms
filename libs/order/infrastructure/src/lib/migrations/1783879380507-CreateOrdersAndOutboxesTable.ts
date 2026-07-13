import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersAndOutboxesTable1783879380507 implements MigrationInterface {
    name = 'CreateOrdersAndOutboxesTable1783879380507';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."order_outboxes_status_enum" AS ENUM('PENDING', 'PUBLISHED', 'FAILED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "order_outboxes" ("id" uuid NOT NULL, "event_type" character varying NOT NULL, "event_version" integer NOT NULL DEFAULT '1', "payload" jsonb NOT NULL, "status" "public"."order_outboxes_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "published_at" TIMESTAMP, "retry_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_85f47e5ac26d136c79671af1a0e" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "order_lines" ("id" uuid NOT NULL, "sku" character varying NOT NULL, "quantity" integer NOT NULL, "unit_price" character varying NOT NULL, "currency" character varying(3) NOT NULL, "line_total" character varying NOT NULL, "order_id" uuid, CONSTRAINT "PK_627dcd7f1d707de4df241b2da6b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_status_enum" AS ENUM('DRAFT', 'CONFIRMED', 'ALLOCATED', 'CANCELLED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "orders" ("id" uuid NOT NULL, "customer_id" uuid NOT NULL, "status" "public"."orders_status_enum" NOT NULL, "channel" character varying(25) NOT NULL, "total_amount" character varying NOT NULL, "currency" character varying(3) NOT NULL, "street" character varying NOT NULL, "city" character varying NOT NULL, "state" character varying NOT NULL, "postcode" character varying NOT NULL, "country" character varying(2) NOT NULL, "version" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_lines" ADD CONSTRAINT "FK_6a619803439ea92778cafc8fb54" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "order_lines" DROP CONSTRAINT "FK_6a619803439ea92778cafc8fb54"`,
        );
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_lines"`);
        await queryRunner.query(`DROP TABLE "order_outboxes"`);
        await queryRunner.query(`DROP TYPE "public"."order_outboxes_status_enum"`);
    }
}
