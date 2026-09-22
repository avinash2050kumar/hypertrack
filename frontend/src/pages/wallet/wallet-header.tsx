import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';

import { Badge, Button, EditableText, Num } from '../../components/ui';
import { AddressChip, PnlValue, TimeWindowTabs } from '../../components/wallet';
import { SOCKET_STATUS_COPY, type SocketStatus } from '../../data';
import { formatRelativeTime, formatUsd, type TimeWindow, type WalletOverview } from '../../domain';
import { useWalletLabel, useWatchlist } from '../../hooks';
import { paletteOf, toneColor } from '../../theme';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

function LiveIndicator({
  status,
  lastUpdate,
}: {
  status: SocketStatus;
  lastUpdate: number | null;
}) {
  const copy = SOCKET_STATUS_COPY[status];
  return (
    <Stack
      direction="row"
      component="span"
      aria-live="polite"
      title={lastUpdate ? `Last push ${formatRelativeTime(lastUpdate)}` : undefined}
      sx={{ alignItems: 'center', gap: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={(theme) => ({
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor:
            copy.tone === 'neutral' ? paletteOf(theme).text.disabled : toneColor(theme, copy.tone),
          animation: copy.pulse ? `${pulse} 2s ease-in-out infinite` : 'none',
        })}
      />
      {copy.label}
    </Stack>
  );
}

interface WalletHeaderProps {
  address: string;
  overview: WalletOverview | undefined;
  loading: boolean;
  window: TimeWindow;
  onWindowChange: (window: TimeWindow) => void;
  socket: { status: SocketStatus; lastUpdate: number | null };
}

export function WalletHeader({
  address,
  overview,
  loading,
  window,
  onWindowChange,
  socket,
}: WalletHeaderProps) {
  const label = useWalletLabel(address);
  const { wallets, add, rename } = useWatchlist();
  const tracked = wallets.some((wallet) => wallet.address === address);

  return (
    <Stack
      component="section"
      direction={{ xs: 'column', md: 'row' }}
      sx={{ gap: 2.5, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}
    >
      <Stack sx={{ minWidth: 0, gap: 1 }}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          {tracked ? (
            <EditableText
              value={label}
              placeholder="Add label"
              label="Wallet label"
              size="lg"
              onSave={(next) => rename(address, next)}
            />
          ) : (
            <Typography variant="h1" sx={{ fontSize: '1.125rem' }}>
              Wallet
            </Typography>
          )}
          <AddressChip address={address} />
          <LiveIndicator status={socket.status} lastUpdate={socket.lastUpdate} />
          {tracked ? (
            <Badge tone="accent">Watching</Badge>
          ) : (
            <Button size="sm" variant="primary" onClick={() => add(address)}>
              + Watch
            </Button>
          )}
        </Stack>
        <Stack
          direction="row"
          sx={{ flexWrap: 'wrap', alignItems: 'baseline', columnGap: 2, rowGap: 0.5 }}
        >
          {loading || !overview ? (
            <Skeleton width={224} height={40} />
          ) : (
            <Num size="2.25rem" weight={600} tone="primary">
              {formatUsd(overview.account.accountValue, { compact: 'never' })}
            </Num>
          )}
          {overview ? (
            <Stack direction="row" component="span" sx={{ alignItems: 'center', gap: 0.75 }}>
              <PnlValue value={overview.pnl24h} arrow size="lg" />
              <Typography component="span" sx={{ color: 'text.disabled' }}>
                24h
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
      <TimeWindowTabs value={window} onChange={onWindowChange} />
    </Stack>
  );
}
