import { Box, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';

import { EmptyState, ErrorState, TabPanel, Tabs } from '../../components/ui';
import { WALLET_TAB_IDS, WALLET_TABS, type WalletTab } from '../../data';
import { parseAddress } from '../../domain';
import { useSearchParam, useTimeWindow, useWalletOverview, useWalletSocket } from '../../hooks';
import { FillsTab } from './fills-tab';
import { OverviewTab } from './overview-tab';
import { PerformanceTab } from './performance-tab';
import { PositionsTab } from './positions-tab';
import { WalletHeader } from './wallet-header';

function isTab(value: unknown): value is WalletTab {
  return WALLET_TAB_IDS.some((tab) => tab === value);
}

function WalletDetail({ address }: { address: string }) {
  const [window, setWindow] = useTimeWindow();
  const [tab, setTab] = useSearchParam<WalletTab>('tab', 'overview', isTab);
  const overview = useWalletOverview(address, window);
  const socket = useWalletSocket(address);
  const data = overview.data?.data;

  return (
    <Stack sx={{ gap: 3 }}>
      <WalletHeader
        address={address}
        overview={data}
        loading={overview.isLoading}
        window={window}
        onWindowChange={setWindow}
        socket={socket}
      />
      {overview.error ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      ) : null}
      <Box>
        <Tabs idPrefix="wallet" items={WALLET_TABS} value={tab} onChange={setTab} />
        <TabPanel idPrefix="wallet" id={tab}>
          {tab === 'overview' ? (
            <OverviewTab
              overview={data}
              loading={overview.isLoading || (!data && !overview.error)}
            />
          ) : null}
          {tab === 'positions' ? <PositionsTab address={address} /> : null}
          {tab === 'performance' ? <PerformanceTab address={address} window={window} /> : null}
          {tab === 'fills' ? <FillsTab address={address} /> : null}
        </TabPanel>
      </Box>
    </Stack>
  );
}

export default function WalletPage() {
  const params = useParams();
  const address = parseAddress(params.address ?? '');
  if (!address) {
    return (
      <EmptyState
        icon="⚠"
        title="That isn’t a wallet address"
        description="Hyperliquid addresses are 0x followed by 40 hexadecimal characters."
      />
    );
  }
  return <WalletDetail key={address} address={address} />;
}
