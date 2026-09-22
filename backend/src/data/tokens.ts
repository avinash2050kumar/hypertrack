export const STABLECOINS: ReadonlySet<string> = new Set([
  'USDC',
  'USDT',
  'USDT0',
  'USDE',
  'USDH',
  'USD',
]);

// Wrapped spot tokens priced off their underlying perp.
export const WRAPPED_TOKENS: Readonly<Record<string, string>> = {
  UBTC: 'BTC',
  UETH: 'ETH',
  USOL: 'SOL',
  UFART: 'FARTCOIN',
  UPUMP: 'PUMP',
};
