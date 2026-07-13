import { DataSource } from 'typeorm';
import { parseEnv } from '@doms/shared/utils';

const parsed = parseEnv();

export default new DataSource({
    type: 'postgres',
    url: parsed.INVENTORY_DB_URL,
    entities: [`libs/inventory/infrastructure/src/lib/**/entities/*.typeorm-entity.ts`],
    migrations: [`libs/inventory/infrastructure/src/lib/migrations/*.ts`],
    synchronize: false,
});

// COMMAND: pnpm migration:generate
// -d libs/inventory/infrastructure/src/lib/db-configs/datasource.config.ts
// libs/inventory/infrastructure/src/lib/migrations/
