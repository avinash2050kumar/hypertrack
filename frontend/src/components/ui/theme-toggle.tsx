import { DarkModeOutlined, LightModeOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const current = mode === 'system' ? systemMode : mode;
  const next = current === 'light' ? 'dark' : 'light';
  return (
    <IconButton
      onClick={() => setMode(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      sx={{ p: 1 }}
    >
      {current === 'light' ? (
        <DarkModeOutlined fontSize="small" />
      ) : (
        <LightModeOutlined fontSize="small" />
      )}
    </IconButton>
  );
}
