import { z } from 'zod';
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'), PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url().refine(url => /^postgres(ql)?:/.test(url), 'Use a PostgreSQL URL.'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(2000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  DB_LOCK_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(1000),
});
export const readEnvironment = (input: Record<string, string | undefined> = process.env) => {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid environment fields: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  return parsed.data;
};
export type Environment = ReturnType<typeof readEnvironment>;
