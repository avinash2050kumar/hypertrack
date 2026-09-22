import { describe, expect, it } from 'vitest';

import { ApiError } from '../../src/api';
import { describeError } from '../../src/lib/errors';

describe('describeError', () => {
  it('should reassure users when Hyperliquid is rate limiting', () => {
    expect(describeError(new ApiError(503, 'UPSTREAM_RATE_LIMITED', 'busy', 12))).toEqual({
      title: 'Hyperliquid is rate limiting us',
      message: 'Retrying in 12s — nothing you need to do.',
      retryInSec: 12,
    });
  });

  it('should fall back to a 30s retry for our own rate limit', () => {
    expect(describeError(new ApiError(429, 'RATE_LIMITED', 'slow')).retryInSec).toBe(30);
  });

  it.each(['UPSTREAM_UNAVAILABLE', 'UPSTREAM_BAD_RESPONSE', 'UPSTREAM_REJECTED'])(
    'should explain %s as Hyperliquid being unreachable',
    (code) => {
      expect(describeError(new ApiError(502, code, 'x')).title).toBe("Can't reach Hyperliquid");
    },
  );

  it('should point to the backend on network failures', () => {
    expect(describeError(new ApiError(0, 'NETWORK', 'x')).title).toBe(
      "Can't reach the HyperTrack API",
    );
  });

  it('should explain an invalid address', () => {
    expect(describeError(new ApiError(400, 'INVALID_ADDRESS', 'x')).title).toBe(
      'That address looks wrong',
    );
  });

  it('should show the server message for unrecognised API errors', () => {
    expect(describeError(new ApiError(418, 'TEAPOT', 'I am a teapot'))).toEqual({
      title: 'Request failed',
      message: 'I am a teapot',
      retryInSec: null,
    });
  });

  it('should use a generic message for non-API errors', () => {
    expect(describeError(new TypeError('undefined is not a function')).title).toBe(
      'Something broke on our side',
    );
  });
});
