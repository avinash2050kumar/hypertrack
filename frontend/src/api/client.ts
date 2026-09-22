import type { ApiErrorPayload, ApiResponse } from '../domain';
import { API_BASE } from './env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSec: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

function retryAfterFrom(details: unknown): number | null {
  if (typeof details !== 'object' || details === null || !('retryAfterSec' in details)) return null;
  return typeof details.retryAfterSec === 'number' ? details.retryAfterSec : null;
}

function isErrorEnvelope(body: unknown): body is { error: ApiErrorPayload } {
  return (
    typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object'
  );
}

async function readError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (!isErrorEnvelope(body)) {
    return new ApiError(
      response.status,
      'HTTP_ERROR',
      `Request failed with status ${response.status}`,
    );
  }
  return new ApiError(
    response.status,
    body.error.code,
    body.error.message,
    retryAfterFrom(body.error.details),
  );
}

export async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the HyperTrack API');
  }
  if (!response.ok) throw await readError(response);
  return response.json();
}
