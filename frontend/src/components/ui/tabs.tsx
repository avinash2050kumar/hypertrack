import { Box, Tab as MuiTab, Tabs as MuiTabs } from '@mui/material';
import type { ReactNode } from 'react';

interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  idPrefix: string;
}

export function Tabs<T extends string>({ items, value, onChange, idPrefix }: TabsProps<T>) {
  const select = (_event: unknown, next: T) => onChange(next);
  return (
    <MuiTabs
      value={value}
      onChange={select}
      variant="scrollable"
      scrollButtons={false}
      sx={{ mb: 2 }}
    >
      {items.map((item) => (
        <MuiTab
          key={item.id}
          value={item.id}
          label={item.label}
          id={`${idPrefix}-tab-${item.id}`}
          aria-controls={`${idPrefix}-panel-${item.id}`}
        />
      ))}
    </MuiTabs>
  );
}

interface TabPanelProps {
  idPrefix: string;
  id: string;
  children: ReactNode;
}

export function TabPanel({ idPrefix, id, children }: TabPanelProps) {
  return (
    <Box role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`}>
      {children}
    </Box>
  );
}
