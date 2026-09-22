import { describe, expect, it } from 'vitest';

import { addressParamsSchema, windowQuerySchema } from '../../src/domain/index.js';
import { AppError } from '../../src/lib/errors.js';
import { validate } from '../../src/middleware/validate.js';
import { ADDRESS } from '../helpers/fixtures.js';

function captureError(run: () => unknown): AppError {
  try {
    run();
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error('expected validate to throw');
}

describe('validate', () => {
  it('should return the parsed value on success', () => {
    expect(
      validate(
        addressParamsSchema,
        { address: ADDRESS.toUpperCase().replace('0X', '0x') },
        'params',
      ),
    ).toEqual({
      address: ADDRESS,
    });
  });

  it('should report INVALID_ADDRESS for a bad address path parameter', () => {
    const error = captureError(() => validate(addressParamsSchema, { address: 'nope' }, 'params'));

    expect(error.status).toBe(400);
    expect(error.code).toBe('INVALID_ADDRESS');
    expect(error.details).toEqual([
      { path: 'address', message: 'Expected a 0x-prefixed 40-character hex address' },
    ]);
  });

  it('should report VALIDATION_FAILED with the source for other inputs', () => {
    const error = captureError(() => validate(windowQuerySchema, { window: 'bad' }, 'query'));

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Invalid request query');
  });
});
