import type { z, ZodTypeAny } from 'zod';

import { AppError } from '../lib/errors.js';

type Source = 'params' | 'query' | 'body';

export function validate<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
  source: Source,
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  const badAddress = source === 'params' && issues.some((issue) => issue.path === 'address');
  if (badAddress) {
    return fail('INVALID_ADDRESS', 'Address must be 0x followed by 40 hex characters', issues);
  }
  return fail('VALIDATION_FAILED', `Invalid request ${source}`, issues);
}

function fail(code: string, message: string, details: unknown): never {
  throw AppError.badRequest(code, message, details);
}
