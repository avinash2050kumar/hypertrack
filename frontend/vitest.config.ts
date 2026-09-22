import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    // Node 25+ ships its own localStorage global, which would shadow jsdom's.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
