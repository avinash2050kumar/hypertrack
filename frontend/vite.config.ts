import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const envDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');
  const apiTarget = env.VITE_API_URL || 'http://localhost:8787';
  const wsTarget = env.VITE_WS_URL || apiTarget.replace(/^http/, 'ws');

  return {
    envDir,
    plugins: [react()],
    // Root MUI imports otherwise get discovered mid-page-load, forcing a ~30s re-optimise and reload.
    optimizeDeps: { include: ['@mui/material', '@mui/icons-material', '@mui/material/styles'] },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/ws': { target: wsTarget, ws: true, changeOrigin: true },
      },
    },
  };
});
