import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  PERSISTENCE_DRIVER: z.enum(['memory', 'dynamodb']).default('memory'),
  AWS_REGION: z.string().min(1).default('us-west-2'),
  DYNAMODB_METADATA_TABLE_NAME: z.string().min(1).default('loopr-metadata'),
});

export type BackendEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): BackendEnv {
  return envSchema.parse(source);
}

export const env = loadEnv();
