import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export function useIsDesktop(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('md'), { noSsr: true, defaultMatches: true });
}
