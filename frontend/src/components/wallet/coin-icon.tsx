import { Box } from '@mui/material';

import { coinColors, paletteOf } from '../../theme';

function hash(symbol: string): number {
  let value = 0;
  for (const char of symbol) value = (value * 31 + char.charCodeAt(0)) % 9973;
  return value;
}

function CoinIcon({ coin }: { coin: string }) {
  const symbol = coin.replace(/^k(?=[A-Z])/, '').replace(/^@/, '#');
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={(theme) => {
        const colors = coinColors(theme);
        const color = colors[hash(symbol) % colors.length] ?? paletteOf(theme).primary.main;
        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: '50%',
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          color,
          bgcolor: theme.alpha(color, 0.18),
        };
      }}
    >
      {symbol.slice(0, 2)}
    </Box>
  );
}

// HIP-3 builder markets prefix the coin with their dex name, e.g. "xyz:GOLD".
function splitDex(coin: string): { dex: string | null; name: string } {
  const [dex, name] = coin.split(':');
  return name ? { dex: dex ?? null, name } : { dex: null, name: coin };
}

export function CoinLabel({ coin }: { coin: string }) {
  const { dex, name } = splitDex(coin);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 500,
        color: 'text.primary',
      }}
    >
      <CoinIcon coin={name} />
      {name}
      {dex ? (
        <Box
          component="span"
          title={`${dex} builder market`}
          sx={{
            px: 0.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 0.5,
            fontSize: 10,
            fontWeight: 400,
            textTransform: 'uppercase',
            color: 'text.disabled',
          }}
        >
          {dex}
        </Box>
      ) : null}
    </Box>
  );
}
