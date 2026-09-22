export interface ExampleWallet {
  address: string;
  label: string;
  blurb: string;
}

export const EXAMPLE_WALLETS: readonly ExampleWallet[] = [
  {
    address: '0xdfc24b077bc1425ad1dea75bcb6f8158e10df303',
    label: 'HLP vault',
    blurb: 'Hyperliquid’s community market-making vault',
  },
  {
    address: '0x5b5d51203a0f9079f8aeb098a6523a13f298c060',
    label: 'Macro whale',
    blurb: 'Nine-figure directional book',
  },
  {
    address: '0xbeccae9ffcb69e9d42a1d4e744abf8056149562d',
    label: 'Active trader',
    blurb: 'Thousands of fills a day across 40+ markets',
  },
  {
    address: '0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4',
    label: 'Whale',
    blurb: 'Thousands of fills a day across 40+ markets',
  },
];
