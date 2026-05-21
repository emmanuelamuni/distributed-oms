import { z } from 'zod';

export const parseEnv = () => {
    const configSchema = z.object({
        ORDER_CAPTURE_PORT: z.coerce.number().default(3001),
        ORDER_ORCHESTRATOR_PORT: z.coerce.number().default(3002),
        INVENTORY_PORT: z.coerce.number().default(3003),
        NOTIFICATION_PORT: z.coerce.number().default(3004),

        GLOBAL_PREFIX: z.coerce.string().default('api/v1'),

        ORDER_DB_URL: z.coerce.string(),
        INVENTORY_DB_URL: z.coerce.string(),
        REDIS_URL: z.coerce.string(),

        OUTBOX_POLL_INTERVAL_MS: z.coerce.number().default(1000),
        OUTBOX_BATCH_SIZE: z.coerce.number().default(100),
        INVENTORY_LOCK_TTL_MS: z.coerce.number().default(5000),
        TTL_SECONDS: z.coerce.number().default(86400),

        NODE_ENV: z.coerce.string().optional(),
    });

    const parsed = configSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('Error:', JSON.stringify(z.treeifyError(parsed.error)));
        throw new Error('Error parsing env');
    }

    return parsed.data;
};
