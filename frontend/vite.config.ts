import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        'kurento-utils': path.resolve(__dirname, 'node_modules/kurento-utils/lib/index.js'),
      },
    },
    optimizeDeps: {
      include: ['kurento-utils'],
    },
    server: {
      host: true, // Listen on all network interfaces
      port: 5173,
      watch: {
        usePolling: true,
      },
      hmr: {
        protocol: 'wss',
        host: env.VITE_HMR_HOST || '192.168.1.50',
        clientPort: 443,
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://backend:8080',
          changeOrigin: true,
        },
        '/signal': {
          target: env.VITE_SIGNAL_URL || 'http://backend:8080',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
