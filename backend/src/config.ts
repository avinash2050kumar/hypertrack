import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  HL_API_URL: z.string().url().default('https://api.hyperliquid.xyz/info'),
  HL_WS_URL: z.string().url().default('wss://api.hyperliquid.xyz/ws'),
  CACHE_TTL_POSITIONS: z.coerce.number().int().nonnegative().default(5_000),
  CACHE_TTL_PORTFOLIO: z.coerce.number().int().nonnegative().default(60_000),
  CACHE_TTL_FILLS: z.coerce.number().int().nonnegative().default(60_000),
  CACHE_TTL_FILLS_PAGED: z.coerce.number().int().nonnegative().default(300_000),
  CACHE_TTL_META: z.coerce.number().int().nonnegative().default(30_000),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_BATCH_PER_MIN: z.coerce.number().int().positive().default(10),
  HL_WEIGHT_PER_MIN: z.coerce.number().int().positive().default(1000),
  WS_MAX_UPSTREAM: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n  ${issues.join('\n  ')}`);
}
