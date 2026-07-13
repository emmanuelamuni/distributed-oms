import DataSource from './datasource.config';

/** COMMAND: pnpm exec tsx libs/inventory/infrastructure/src/lib/db-configs/migration.config.ts */

async function runInventoryMigrations() {
    console.log('Starting migration script for inventory...');

    try {
        await DataSource.initialize();
        await DataSource.runMigrations();
        await DataSource.destroy();

        console.log('Migration script for inventory finished successfully...');
    } catch (error) {
        console.error(`Error occurred during the migration\n${error}`);
        process.exit(1);
    } finally {
        if (DataSource && DataSource.isInitialized) {
            await DataSource.destroy();
        }
    }
}

if (require.main === module && !process.argv[1].includes('main.js')) {
    runInventoryMigrations();
}
