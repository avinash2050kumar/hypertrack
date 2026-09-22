export const EMPTY_VALUE = '—';
export const MINUS_SIGN = '−';
export const COMPACT_THRESHOLD = 1_000_000;

// Below these magnitudes a PnL reads as flat rather than green or red.
export const PNL_NEUTRAL_EPSILON = { usd: 0.005, pct: 0.00005 } as const;
