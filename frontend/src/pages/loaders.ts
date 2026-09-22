// Shared by the router and by prefetch-on-hover so both warm the same chunk.
export const loadDashboardPage = () => import('./dashboard/dashboard-page');
export const loadWalletPage = () => import('./wallet/wallet-page');
export const loadComparePage = () => import('./compare/compare-page');
export const loadNotFoundPage = () => import('./not-found-page');
