import { ApiError } from '../api';

interface ErrorCopy {
  title: string;
  message: string;
  retryInSec: number | null;
}

export function describeError(error: unknown): ErrorCopy {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Something broke on our side',
      message: 'Reload the page to try again.',
      retryInSec: null,
    };
  }
  const retry = error.retryAfterSec;
  switch (error.code) {
    case 'UPSTREAM_RATE_LIMITED':
      return {
        title: 'Hyperliquid is rate limiting us',
        message: `Retrying in ${retry ?? 5}s — nothing you need to do.`,
        retryInSec: retry ?? 5,
      };
    case 'RATE_LIMITED':
      return {
        title: 'Slow down a little',
        message: `You've hit the request limit. Retrying in ${retry ?? 30}s.`,
        retryInSec: retry ?? 30,
      };
    case 'UPSTREAM_TIMEOUT':
      return {
        title: 'Hyperliquid is slow to respond',
        message: 'It took longer than 8s. Retrying automatically.',
        retryInSec: null,
      };
    case 'UPSTREAM_UNAVAILABLE':
    case 'UPSTREAM_BAD_RESPONSE':
    case 'UPSTREAM_REJECTED':
      return {
        title: "Can't reach Hyperliquid",
        message: 'Their API is failing right now. Try again in a minute.',
        retryInSec: null,
      };
    case 'INVALID_ADDRESS':
      return {
        title: 'That address looks wrong',
        message: 'Use a 0x-prefixed, 40-character wallet address.',
        retryInSec: null,
      };
    case 'NETWORK':
      return {
        title: "Can't reach the HyperTrack API",
        message: 'Check that the backend is running (pnpm dev starts both apps).',
        retryInSec: null,
      };
    default:
      return { title: 'Request failed', message: error.message, retryInSec: null };
  }
}
