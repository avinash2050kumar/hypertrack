import type { CSSProperties } from 'react';

interface SeriesPalette {
  a: string;
  b: string;
  c: string;
  d: string;
}

interface CoinPalette {
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  c6: string;
  c7: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    raised: string;
    backdrop: string;
    series: SeriesPalette;
    coin: CoinPalette;
  }
  interface PaletteOptions {
    raised?: string;
    backdrop?: string;
    series?: SeriesPalette;
    coin?: CoinPalette;
  }
  interface TypographyVariants {
    mono: CSSProperties;
    label: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
    label?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
    label: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    danger: true;
  }
}
