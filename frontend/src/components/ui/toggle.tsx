import { Switch } from '@mui/material';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <Switch
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      slotProps={{ input: { 'aria-label': label } }}
    />
  );
}
