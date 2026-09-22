import type { Theme } from '@mui/material/styles';

export type Tone = 'neutral' | 'positive' | 'negative' | 'accent' | 'warning';

// Prefers CSS-variable colours so values follow light/dark mode without re-rendering.
export function paletteOf(theme: Theme) {
  return (theme.vars ?? theme).palette;
}

export function toneColor(theme: Theme, tone: Tone): string {
  const palette = paletteOf(theme);
  switch (tone) {
    case 'positive':
      return palette.success.main;
    case 'negative':
      return palette.error.main;
    case 'accent':
      return palette.primary.main;
    case 'warning':
      return palette.warning.main;
    default:
      return palette.text.secondary;
  }
}

export function seriesColors(theme: Theme): string[] {
  const { a, b, c, d } = paletteOf(theme).series;
  return [a, b, c, d];
}

export function coinColors(theme: Theme): string[] {
  return Object.values(paletteOf(theme).coin);
}

export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;
