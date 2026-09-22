import { ReportProblemOutlined } from '@mui/icons-material';
import { Box, Stack } from '@mui/material';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button, EmptyState, LinkButton } from '../components/ui';

export default function RouteErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;
  return (
    <Box sx={{ mx: 'auto', maxWidth: 576, px: 2, py: 8 }}>
      <EmptyState
        icon={<ReportProblemOutlined />}
        title="This page hit an unexpected error"
        description={
          <>
            Reloading usually fixes it. If it keeps happening, the details below help us track it
            down.
            {detail ? (
              <Box
                component="code"
                sx={(theme) => ({
                  ...theme.typography.mono,
                  mt: 1.5,
                  display: 'block',
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: 'raised',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                })}
              >
                {detail}
              </Box>
            ) : null}
          </>
        }
        action={
          <Stack direction="row" sx={{ justifyContent: 'center', gap: 1 }}>
            <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <LinkButton to="/">Back to watchlist</LinkButton>
          </Stack>
        }
      />
    </Box>
  );
}
