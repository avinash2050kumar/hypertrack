import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { Suspense } from 'react';
import { NavLink, Outlet, Link as RouterLink } from 'react-router-dom';

import { ThemeToggle } from './components/ui';
import { NAV_ITEMS } from './data';
import { useThemedFavicon } from './hooks';
import { paletteOf, visuallyHidden } from './theme';

function Logo() {
  return (
    <Link
      component={RouterLink}
      to="/"
      underline="none"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: 'text.primary',
      }}
    >
      <Box component="svg" aria-hidden="true" viewBox="0 0 32 32" sx={{ width: 28, height: 28 }}>
        <Box
          component="rect"
          width="32"
          height="32"
          rx="8"
          sx={{ fill: (theme) => paletteOf(theme).raised }}
        />
        <Box
          component="path"
          d="M7 21l6-7 4 4 8-9"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          sx={{ stroke: (theme) => paletteOf(theme).primary.main }}
        />
      </Box>
      HyperTrack
    </Link>
  );
}

function PageFallback() {
  return (
    <Stack sx={{ gap: 2 }} aria-busy="true">
      <Skeleton width={224} height={32} />
      <Skeleton height={96} sx={{ borderRadius: 3 }} />
      <Skeleton height={288} sx={{ borderRadius: 3 }} />
    </Stack>
  );
}

export function App() {
  useThemedFavicon();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box
        component="a"
        href="#main"
        sx={{
          ...visuallyHidden,
          '&:focus': {
            position: 'fixed',
            top: 16,
            left: 16,
            width: 'auto',
            height: 'auto',
            clip: 'auto',
            zIndex: 'tooltip',
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: 'background.paper',
            color: 'text.primary',
          },
        }}
      >
        Skip to content
      </Box>
      <AppBar>
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: { xs: 56 }, gap: 3 }}>
            <Logo />
            <Stack component="nav" aria-label="Primary" direction="row" sx={{ gap: 0.5 }}>
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.end}
                  variant="text"
                  size="small"
                  sx={{
                    height: 32,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    '&.active': { bgcolor: 'raised', color: 'text.primary' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Box sx={{ ml: 'auto' }}>
              <ThemeToggle />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        id="main"
        component="main"
        maxWidth="xl"
        sx={{ flex: 1, px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 4 } }}
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </Container>
      <Box
        component="footer"
        sx={{ borderTop: 1, borderColor: 'divider', py: 2, textAlign: 'center' }}
      >
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          Data from the public Hyperliquid API · Not financial advice
        </Typography>
      </Box>
    </Box>
  );
}
