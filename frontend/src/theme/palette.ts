import type { ColorSystemOptions } from '@mui/material/styles';

// The only place colour values are defined; everything else reads them from the theme.
export const darkPalette: ColorSystemOptions['palette'] = {
  mode: 'dark',
  primary: { main: '#34d3b4', contrastText: '#061411' },
  success: { main: '#34d399' },
  error: { main: '#f87171' },
  warning: { main: '#facc15' },
  info: { main: '#38bdf8' },
  background: { default: '#090c0d', paper: '#101516' },
  text: { primary: '#e6ecea', secondary: '#92a09c', disabled: '#62706c' },
  divider: '#242d2e',
  raised: '#181f20',
  backdrop: '#000000',
  series: { a: '#34d3b4', b: '#a78bfa', c: '#f59e0b', d: '#38bdf8' },
  coin: {
    c0: '#2dd4bf',
    c1: '#a78bfa',
    c2: '#fbbf24',
    c3: '#38bdf8',
    c4: '#fb7185',
    c5: '#a3e635',
    c6: '#fb923c',
    c7: '#818cf8',
  },
};

export const lightPalette: ColorSystemOptions['palette'] = {
  mode: 'light',
  primary: { main: '#0d947a', contrastText: '#ffffff' },
  success: { main: '#059669' },
  error: { main: '#dc2626' },
  warning: { main: '#ca8a04' },
  info: { main: '#0284c7' },
  background: { default: '#f6f7f5', paper: '#ffffff' },
  text: { primary: '#111816', secondary: '#586561', disabled: '#8c9894' },
  divider: '#dce1dd',
  raised: '#eef1ee',
  backdrop: '#000000',
  series: { a: '#0d947a', b: '#7c3aed', c: '#d97706', d: '#0284c7' },
  coin: {
    c0: '#0d9488',
    c1: '#7c3aed',
    c2: '#b45309',
    c3: '#0369a1',
    c4: '#e11d48',
    c5: '#4d7c0f',
    c6: '#c2410c',
    c7: '#4338ca',
  },
};
