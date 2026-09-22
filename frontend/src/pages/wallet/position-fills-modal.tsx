import { Box, Typography } from '@mui/material';

import { ErrorState, Modal } from '../../components/ui';
import { FillsTable } from '../../components/wallet';
import { formatDateTime, type PositionTrip } from '../../domain';
import { useTripFills } from '../../hooks';

interface PositionFillsModalProps {
  address: string;
  trip: PositionTrip | null;
  onClose: () => void;
}

export function PositionFillsModal({ address, trip, onClose }: PositionFillsModalProps) {
  const query = useTripFills(address, trip);
  const fills = query.data?.data.fills ?? [];
  const title = trip ? `${trip.side === 'long' ? 'Long' : 'Short'} ${trip.coin}` : '';
  const shown =
    trip && fills.length < trip.fillCount
      ? ` · showing latest ${fills.length} of ${trip.fillCount}`
      : '';

  return (
    <Modal open={trip !== null} onClose={onClose} title={title} size="lg">
      {trip ? (
        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
          {formatDateTime(trip.openedAt)} →{' '}
          {trip.closedAt ? formatDateTime(trip.closedAt) : 'still open'}
          {shown}
        </Typography>
      ) : null}
      <Box sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <FillsTable label="Position fills" fills={fills} loading={query.isLoading} />
        )}
      </Box>
    </Modal>
  );
}
