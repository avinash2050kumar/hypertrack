export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
export const MAX_BATCH_ADDRESSES = 25;
export const MAX_COMPARE_ADDRESSES = 4;
export const MAX_LABEL_LENGTH = 40;

export const ADDRESS_INPUT_ERRORS = {
  empty: 'Paste a wallet address to track it.',
  invalid: 'That isn’t a valid address — expected 0x followed by 40 hex characters.',
  duplicate: 'Already on your watchlist.',
} as const;
