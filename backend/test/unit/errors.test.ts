import { describe, expect, it } from 'vitest';

import { AppError, toAppError, UpstreamError } from '../../src/lib/errors.js';

describe('AppError', () => {
  it('should build a 400 bad request', () => {
    const error = AppError.badRequest('BAD', 'Bad input', { field: 'x' });

    expect(error).toMatchObject({ status: 400, code: 'BAD', message: 'Bad input' });
    expect(error.toPayload()).toEqual({
      code: 'BAD',
      message: 'Bad input',
      details: { field: 'x' },
    });
  });

  it('should omit details from the payload when there are none', () => {
    expect(AppError.notFound('Missing').toPayload()).toEqual({
      code: 'NOT_FOUND',
      message: 'Missing',
    });
  });

  it('should carry retryAfterSec on rate limit errors', () => {
    const error = AppError.rateLimited('Slow down', 12);

    expect(error.status).toBe(429);
    expect(error.details).toEqual({ retryAfterSec: 12 });
  });
});

describe('UpstreamError', () => {
  it('should map upstream rate limiting to 503', () => {
    expect(new UpstreamError('UPSTREAM_RATE_LIMITED', 'busy').status).toBe(503);
  });

  it('should map other upstream failures to 502', () => {
    expect(new UpstreamError('UPSTREAM_UNAVAILABLE', 'down').status).toBe(502);
  });
});

describe('toAppError', () => {
  it('should pass AppErrors through unchanged', () => {
    const error = AppError.notFound('Missing');

    expect(toAppError(error)).toBe(error);
  });

  it('should hide unknown errors behind a generic 500', () => {
    const error = toAppError(new Error('database password is hunter2'));

    expect(error.status).toBe(500);
    expect(error.toPayload()).toEqual({ code: 'INTERNAL', message: 'Unexpected server error' });
  });
});
