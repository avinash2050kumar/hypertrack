import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { App } from './App';
import {
  loadComparePage,
  loadDashboardPage,
  loadNotFoundPage,
  loadWalletPage,
} from './pages/loaders';
import RouteErrorPage from './pages/route-error-page';

const DashboardPage = lazy(loadDashboardPage);
const WalletPage = lazy(loadWalletPage);
const ComparePage = lazy(loadComparePage);
const NotFoundPage = lazy(loadNotFoundPage);

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'wallet/:address', element: <WalletPage /> },
        { path: 'compare', element: <ComparePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
