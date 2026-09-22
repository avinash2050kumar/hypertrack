import { SearchOffRounded } from '@mui/icons-material';

import { EmptyState, LinkButton } from '../components/ui';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchOffRounded />}
      title="Page not found"
      description="The page you’re looking for doesn’t exist."
      action={<LinkButton to="/">Back to watchlist</LinkButton>}
    />
  );
}
