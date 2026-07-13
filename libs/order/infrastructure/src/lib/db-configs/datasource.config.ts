import { DataSource } from 'typeorm';
import { parseEnv } from '@doms/shared/utils';

const parsed = parseEnv();

export default new DataSource({
    type: 'postgres',
    url: parsed.ORDER_DB_URL,
    entities: [`libs/order/infrastructure/src/lib/**/entities/*.typeorm-entity.ts`],
    migrations: [`libs/order/infrastructure/src/lib/migrations/*.ts`],
    synchronize: false,
});

// COMMAND: pnpm migration:generate
// -d libs/order/infrastructure/src/lib/db-configs/datasource.config.ts
// libs/order/infrastructure/src/lib/migrations/
