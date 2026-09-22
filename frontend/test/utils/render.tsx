import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { ToastProvider } from '../../src/components/ui';
import { theme } from '../../src/theme';

interface ProviderOptions {
  route?: string;
  queryClient?: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

export function Providers({
  children,
  route = '/',
  queryClient = createTestQueryClient(),
}: ProviderOptions & { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter
            initialEntries={[route]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            {children}
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { route, queryClient, ...options }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <Providers route={route} queryClient={queryClient}>
          {children}
        </Providers>
      ),
      ...options,
    }),
  };
}
