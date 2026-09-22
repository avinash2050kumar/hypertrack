import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useTimeWindow } from '../../src/hooks';

function setup(route: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => {
      const [window, setWindow] = useTimeWindow();
      return { window, setWindow, search: useLocation().search };
    },
    { wrapper },
  );
}

describe('useTimeWindow', () => {
  it('should read the window from the URL', () => {
    expect(setup('/wallet/x?window=30d').result.current.window).toBe('30d');
  });

  it('should fall back to 7d for missing or invalid values', () => {
    expect(setup('/wallet/x').result.current.window).toBe('7d');
    expect(setup('/wallet/x?window=forever').result.current.window).toBe('7d');
  });

  it('should write the chosen window to the URL and keep other params', () => {
    const { result } = setup('/wallet/x?tab=fills');

    act(() => result.current.setWindow('24h'));

    expect(result.current.window).toBe('24h');
    expect(new URLSearchParams(result.current.search).get('tab')).toBe('fills');
    expect(new URLSearchParams(result.current.search).get('window')).toBe('24h');
  });

  it('should drop the param when set back to the default', () => {
    const { result } = setup('/wallet/x?window=30d');

    act(() => result.current.setWindow('7d'));

    expect(result.current.search).toBe('');
  });
});
