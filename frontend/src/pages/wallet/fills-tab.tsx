import { Box } from '@mui/material';

import { Button, Card, CardHeader, ErrorState } from '../../components/ui';
import { FillsTable } from '../../components/wallet';
import { useWalletFills } from '../../hooks';

export function FillsTab({ address }: { address: string }) {
  const query = useWalletFills(address);
  const fills = query.data?.pages.flatMap((page) => page.data.fills) ?? [];

  return (
    <Card>
      <CardHeader title="Fills" subtitle={`${fills.length} loaded · newest first`} />
      <Box sx={{ pt: 1 }}>
        {query.error && !fills.length ? (
          <Box sx={{ p: 2 }}>
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          </Box>
        ) : (
          <FillsTable fills={fills} loading={query.isLoading} />
        )}
      </Box>
      {query.hasNextPage ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            borderTop: 1,
            borderColor: 'divider',
            p: 1.5,
          }}
        >
          <Button
            size="sm"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load older fills
          </Button>
        </Box>
      ) : null}
    </Card>
  );
}
