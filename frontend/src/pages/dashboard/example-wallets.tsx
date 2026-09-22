import { Box, ButtonBase, Typography } from '@mui/material';

import { Num } from '../../components/ui';
import { EXAMPLE_WALLETS } from '../../data';
import { shortAddress } from '../../domain';
import { paletteOf } from '../../theme';

export function ExampleWallets({ onPick }: { onPick: (address: string, label: string) => void }) {
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        mx: 'auto',
        maxWidth: 672,
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { sm: 'repeat(3, 1fr)' },
        textAlign: 'left',
      }}
    >
      {EXAMPLE_WALLETS.map((example) => (
        <li key={example.address}>
          <ButtonBase
            onClick={() => onPick(example.address, example.label)}
            sx={(theme) => {
              const accent = paletteOf(theme).primary.main;
              return {
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.5,
                p: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                textAlign: 'left',
                bgcolor: theme.alpha(paletteOf(theme).background.default, 0.4),
                transition: 'border-color 120ms, background-color 120ms',
                '&:hover': {
                  borderColor: theme.alpha(accent, 0.6),
                  bgcolor: theme.alpha(accent, 0.05),
                },
              };
            }}
          >
            <Typography sx={{ fontWeight: 500 }}>{example.label}</Typography>
            <Num size="0.75rem" tone="disabled">
              {shortAddress(example.address)}
            </Num>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {example.blurb}
            </Typography>
          </ButtonBase>
        </li>
      ))}
    </Box>
  );
}
