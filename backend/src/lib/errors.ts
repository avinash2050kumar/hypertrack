import type { ApiErrorPayload } from '../domain/index.js';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code: string, message: string, details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static notFound(message: string): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static rateLimited(message: string, retryAfterSec: number): AppError {
    return new AppError(429, 'RATE_LIMITED', message, { retryAfterSec });
  }

  toPayload(): ApiErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export class UpstreamError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code === 'UPSTREAM_RATE_LIMITED' ? 503 : 502, code, message, details);
    this.name = 'UpstreamError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError(500, 'INTERNAL', 'Unexpected server error');
}
