import { z } from 'zod';

import {
  ADDRESS_PATTERN,
  DEFAULT_FILLS_LIMIT,
  DEFAULT_WINDOW,
  MAX_BATCH_ADDRESSES,
  MAX_COIN_LENGTH,
  MAX_FILLS_LIMIT,
  TIME_WINDOWS,
} from '../data/index.js';

const addressSchema = z
  .string()
  .trim()
  .regex(ADDRESS_PATTERN, 'Expected a 0x-prefixed 40-character hex address')
  .transform((value) => value.toLowerCase());

const timeWindowSchema = z.enum(TIME_WINDOWS);

export const windowQuerySchema = z.object({
  window: timeWindowSchema.default(DEFAULT_WINDOW),
});

export const addressParamsSchema = z.object({
  address: addressSchema,
});

export const fillsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_FILLS_LIMIT).default(DEFAULT_FILLS_LIMIT),
  before: z.coerce.number().int().positive().optional(),
  after: z.coerce.number().int().nonnegative().optional(),
  coin: z.string().trim().min(1).max(MAX_COIN_LENGTH).optional(),
});

export type FillsQuery = z.infer<typeof fillsQuerySchema>;

export const batchBodySchema = z.object({
  addresses: z
    .array(z.string())
    .min(1, 'Provide at least one address')
    .max(MAX_BATCH_ADDRESSES, `At most ${MAX_BATCH_ADDRESSES} addresses per batch`),
  window: timeWindowSchema.default(DEFAULT_WINDOW),
});

export function parseAddress(input: string): string | null {
  const result = addressSchema.safeParse(input);
  return result.success ? result.data : null;
}
