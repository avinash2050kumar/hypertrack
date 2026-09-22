import { createTheme } from '@mui/material/styles';

import { darkPalette, lightPalette } from './palette';

const SANS = '"Inter Tight", Inter, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class', nativeColor: true },
  defaultColorScheme: 'dark',
  colorSchemes: { dark: { palette: darkPalette }, light: { palette: lightPalette } },
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: SANS,
    fontSize: 14,
    h1: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
    h2: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
    h3: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.75rem', lineHeight: 1.5 },
    caption: { fontSize: '0.6875rem', lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 500 },
    mono: { fontFamily: MONO, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' },
    label: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      lineHeight: 1.4,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        body: { fontFeatureSettings: '"ss01", "cv11"', minHeight: '100vh' },
        '::selection': { backgroundColor: theme.alpha(theme.vars.palette.primary.main, 0.3) },
        ':focus-visible': {
          outline: `2px solid ${theme.vars.palette.primary.main}`,
          outlineOffset: 2,
        },
      }),
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true, variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          gap: theme.spacing(1),
          whiteSpace: 'nowrap',
          minWidth: 0,
          transition: 'background-color 120ms, border-color 120ms, color 120ms',
        }),
        sizeSmall: ({ theme }) => ({
          height: 32,
          padding: theme.spacing(0, 1.5),
          fontSize: '0.75rem',
        }),
        sizeMedium: ({ theme }) => ({
          height: 40,
          padding: theme.spacing(0, 2),
          fontSize: '0.875rem',
        }),
        contained: { fontWeight: 600 },
        outlined: ({ theme }) => ({
          backgroundColor: theme.vars.palette.raised,
          borderColor: theme.vars.palette.divider,
          color: theme.vars.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.vars.palette.raised,
            borderColor: theme.vars.palette.text.disabled,
          },
        }),
        text: ({ theme }) => ({
          color: theme.vars.palette.text.secondary,
          '&:hover': {
            backgroundColor: theme.vars.palette.raised,
            color: theme.vars.palette.text.primary,
          },
        }),
      },
      variants: [
        {
          props: { variant: 'danger' },
          style: ({ theme }) => ({
            color: theme.vars.palette.text.secondary,
            '&:hover': {
              color: theme.vars.palette.error.main,
              backgroundColor: theme.alpha(theme.vars.palette.error.main, 0.1),
            },
          }),
        },
      ],
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          color: theme.vars.palette.text.disabled,
          '&:hover': {
            backgroundColor: theme.vars.palette.raised,
            color: theme.vars.palette.text.primary,
          },
        }),
      },
      variants: [
        {
          props: { color: 'error' },
          style: ({ theme }) => ({
            color: theme.vars.palette.text.disabled,
            '&:hover': {
              color: theme.vars.palette.error.main,
              backgroundColor: theme.alpha(theme.vars.palette.error.main, 0.1),
            },
          }),
        },
      ],
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          backgroundColor: theme.vars.palette.background.paper,
          borderColor: theme.vars.palette.divider,
        }),
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent', position: 'sticky' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.alpha(theme.vars.palette.background.default, 0.85),
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          padding: theme.spacing(1.25, 1.5),
          whiteSpace: 'nowrap',
          '&:first-of-type': { paddingLeft: theme.spacing(2) },
          '&:last-of-type': { paddingRight: theme.spacing(2) },
          [theme.breakpoints.up('sm')]: {
            '&:first-of-type': { paddingLeft: theme.spacing(2.5) },
            '&:last-of-type': { paddingRight: theme.spacing(2.5) },
          },
        }),
        head: ({ theme }) => ({
          ...theme.typography.label,
          color: theme.vars.palette.text.disabled,
        }),
        body: ({ theme }) => ({ fontSize: '0.875rem', color: theme.vars.palette.text.primary }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:last-of-type td': { borderBottom: 0 } },
        hover: ({ theme }) => ({
          '&:hover, &:focus-visible': {
            backgroundColor: theme.alpha(theme.vars.palette.raised, 0.6),
          },
        }),
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': { color: theme.vars.palette.text.primary },
          '&.Mui-active': { color: theme.vars.palette.text.primary },
        }),
        icon: ({ theme }) => ({ fontSize: 14, margin: theme.spacing(0, 0.25) }),
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.vars.palette.raised,
          color: theme.vars.palette.text.primary,
          border: `1px solid ${theme.vars.palette.divider}`,
          fontSize: '0.75rem',
          fontWeight: 400,
          maxWidth: 256,
          padding: theme.spacing(0.75, 1.25),
          boxShadow: theme.shadows[4],
        }),
        arrow: ({ theme }) => ({ color: theme.vars.palette.raised }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 40,
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
        indicator: ({ theme }) => ({ backgroundColor: theme.vars.palette.primary.main }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 40,
          minWidth: 0,
          padding: theme.spacing(1.25, 1.5),
          fontSize: '0.875rem',
          color: theme.vars.palette.text.secondary,
          '&:hover': { color: theme.vars.palette.text.primary },
          '&.Mui-selected': { color: theme.vars.palette.text.primary },
        }),
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          border: `1px solid ${theme.vars.palette.divider}`,
          borderRadius: 8,
          padding: 2,
          gap: 2,
        }),
        grouped: { border: 0, borderRadius: '6px !important', margin: 0 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...theme.typography.mono,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: theme.spacing(0.5, 1.25),
          color: theme.vars.palette.text.secondary,
          '&:hover': { backgroundColor: 'transparent', color: theme.vars.palette.text.primary },
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: theme.vars.palette.raised,
            color: theme.vars.palette.text.primary,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          borderRadius: 6,
          fontSize: '0.875rem',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.text.disabled,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.primary.main,
            borderWidth: 1,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.error.main,
          },
        }),
        input: ({ theme }) => ({
          height: 40,
          boxSizing: 'border-box',
          padding: theme.spacing(0, 1.5),
          '&::placeholder': { color: theme.vars.palette.text.disabled, opacity: 1 },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          border: `1px solid ${theme.vars.palette.divider}`,
          borderRadius: 12,
          margin: theme.spacing(2),
          width: `calc(100% - ${theme.spacing(4)})`,
        }),
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:not(.MuiBackdrop-invisible)': {
            backgroundColor: theme.alpha(theme.vars.palette.backdrop, 0.6),
          },
        }),
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave', variant: 'rounded' },
      styleOverrides: {
        root: ({ theme }) => ({ backgroundColor: theme.vars.palette.raised, borderRadius: 4 }),
      },
    },
    MuiSwitch: {
      defaultProps: { size: 'small' },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.raised,
          color: theme.vars.palette.text.primary,
          border: `1px solid ${theme.vars.palette.divider}`,
          borderRadius: 8,
          fontSize: '0.875rem',
        }),
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover', color: 'inherit' },
    },
  },
});
