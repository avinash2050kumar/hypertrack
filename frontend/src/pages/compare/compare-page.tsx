import { CloseRounded, CompareArrowsRounded } from '@mui/icons-material';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQueries } from '@tanstack/react-query';

import { walletApi, walletKeys } from '../../api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
} from '../../components/ui';
import {
  AddressInput,
  EquityChart,
  METRICS,
  metricStats,
  TimeWindowTabs,
  WalletCard,
  windowLabel,
  type AddressSubmitResult,
  type ChartSeries,
} from '../../components/wallet';
import { COMPARE_CARD_METRICS, MAX_COMPARE_ADDRESSES } from '../../data';
import { shortAddress } from '../../domain';
import { useTimeWindow, useWatchlist } from '../../hooks';
import { paletteOf, seriesColors } from '../../theme';
import { ComparisonTable, type Slot } from './comparison-table';
import { useCompareAddresses } from './use-compare-addresses';

export default function ComparePage() {
  const [addresses, setAddresses] = useCompareAddresses();
  const [window, setWindow] = useTimeWindow();
  const { wallets } = useWatchlist();
  const theme = useTheme();
  const colors = seriesColors(theme);

  const queries = useQueries({
    queries: addresses.map((address) => ({
      queryKey: walletKeys.overview(address, window),
      queryFn: () => walletApi.overview(address, window),
    })),
  });

  const labelFor = (address: string) =>
    wallets.find((wallet) => wallet.address === address)?.label || shortAddress(address);

  const slots: Slot[] = addresses.map((address, i) => ({
    address,
    color: colors[i % colors.length] ?? paletteOf(theme).primary.main,
    label: labelFor(address),
    overview: queries[i]?.data?.data,
    loading: queries[i]?.isLoading ?? true,
    error: queries[i]?.error ?? null,
  }));

  const series: ChartSeries[] = slots.map((slot) => ({
    id: slot.address,
    label: slot.label,
    color: slot.color,
    points: slot.overview?.charts.equityIndex ?? [],
  }));

  const addAddress = (address: string): AddressSubmitResult => {
    if (addresses.includes(address)) return 'duplicate';
    setAddresses([...addresses, address].slice(0, MAX_COMPARE_ADDRESSES));
    return 'added';
  };

  const suggestions = wallets.filter((wallet) => !addresses.includes(wallet.address)).slice(0, 6);
  const full = addresses.length >= MAX_COMPARE_ADDRESSES;

  return (
    <Stack sx={{ gap: 3 }}>
      <PageHeader
        title="Compare wallets"
        subtitle={`Up to ${MAX_COMPARE_ADDRESSES} wallets, equity indexed to 100 at the start of the window.`}
        aside={<TimeWindowTabs value={window} onChange={setWindow} />}
      />

      {!full ? (
        <Card>
          <CardBody sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <AddressInput onSubmit={addAddress} submitLabel="Add" />
            {suggestions.length ? (
              <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" component="span" sx={{ color: 'text.disabled' }}>
                  From watchlist:
                </Typography>
                {suggestions.map((wallet) => (
                  <Button key={wallet.address} size="sm" onClick={() => addAddress(wallet.address)}>
                    + {wallet.label || shortAddress(wallet.address)}
                  </Button>
                ))}
              </Stack>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {addresses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CompareArrowsRounded />}
            title="Nothing to compare yet"
            description="Add two or more wallets above, or pick them from your watchlist."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title="Normalized equity"
              subtitle={`Flow-adjusted, 100 = start of ${windowLabel(window)}`}
            />
            <CardBody>
              <EquityChart
                label="Normalized equity curves"
                series={series}
                baseline={100}
                height={300}
                loading={slots.every((slot) => slot.loading)}
                formatValue={(v) => v.toFixed(0)}
              />
            </CardBody>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                sm: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {slots.map((slot) => (
              <WalletCard
                key={slot.address}
                address={slot.address}
                label={slot.label}
                color={slot.color}
                loading={slot.loading}
                accountValue={slot.overview?.account.accountValue}
                pnl={slot.overview?.metrics.pnl}
                pnlLabel={`PnL ${windowLabel(window)}`}
                stats={
                  slot.overview
                    ? metricStats(COMPARE_CARD_METRICS, slot.overview)
                    : COMPARE_CARD_METRICS.map((id) => ({
                        id,
                        label: METRICS[id].label,
                        value: null,
                      }))
                }
                footer={slot.error ? <ErrorState compact error={slot.error} /> : null}
                actions={
                  <IconButton
                    color="error"
                    aria-label={`Remove ${slot.label} from comparison`}
                    onClick={() => setAddresses(addresses.filter((a) => a !== slot.address))}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                }
              />
            ))}
          </Box>

          <Card>
            <CardHeader title="Side by side" subtitle="Best value per row highlighted" />
            <Box sx={{ pt: 1 }}>
              <ComparisonTable slots={slots} />
            </Box>
          </Card>
        </>
      )}
    </Stack>
  );
}
