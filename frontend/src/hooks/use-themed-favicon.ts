import { useColorScheme } from '@mui/material/styles';
import { useEffect } from 'react';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Favicons render outside the page, so CSS variables can't reach them; bake in the resolved theme colours.
export function useThemedFavicon(): void {
  const { mode, systemMode } = useColorScheme();
  const scheme = mode === 'system' ? systemMode : mode;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const background = cssVar('--mui-palette-raised');
      const accent = cssVar('--mui-palette-primary-main');
      if (!background || !accent) return;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${background}"/><path d="M7 21l6-7 4 4 8-9" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const link =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
        document.head.appendChild(document.createElement('link'));
      link.rel = 'icon';
      link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [scheme]);
}
