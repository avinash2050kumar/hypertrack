import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

function matchesViewport(query: string): boolean {
  const width = window.innerWidth;
  const min = /min-width:\s*([\d.]+)px/.exec(query);
  const max = /max-width:\s*([\d.]+)px/.exec(query);
  if (min?.[1] && width < Number(min[1])) return false;
  if (max?.[1] && width > Number(max[1])) return false;
  return Boolean(min || max);
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: matchesViewport(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);
window.innerWidth = 1280;

afterEach(() => {
  cleanup();
  window.innerWidth = 1280;
  localStorage.clear();
});
