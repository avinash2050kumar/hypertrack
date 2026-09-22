import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { ApiError } from './api';
import { ToastProvider } from './components/ui';
import {
  MAX_QUERY_RETRIES,
  MAX_RETRY_DELAY_MS,
  QUERY_STALE_MS,
  SECOND_MS,
  THEME_STORAGE_KEY,
} from './data';
import { router } from './routes';
import { syncStoresAcrossTabs } from './store';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_MS,
      retry: (failures, error) =>
        error instanceof ApiError && error.retryable && failures < MAX_QUERY_RETRIES,
      retryDelay: (attempt, error) =>
        error instanceof ApiError && error.retryAfterSec
          ? error.retryAfterSec * SECOND_MS
          : Math.min(SECOND_MS * 2 ** attempt, MAX_RETRY_DELAY_MS),
    },
  },
});

syncStoresAcrossTabs();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={THEME_STORAGE_KEY}>
        <CssBaseline enableColorScheme />
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
