import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), removeConsole({
      external: ['error', 'warn']
    })],
  esbuild: {
    target: 'es2020',
  },
  build: {
    // Keep renderChunk transpile off on Windows (avoids Temp Access Denied IPC error)
    // while esbuild module transform + terser ecma:2020 still compile app syntax for Chrome 87+/Safari 14+.
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        ecma: 2020,
      },
    },
    rollupOptions: {
      output: {
        // Split stable, always-loaded vendor code into cacheable chunks.
        // recharts + fingerprintjs are intentionally NOT listed: they're now
        // dynamically imported, so Rollup keeps them in their own on-demand
        // chunks, out of the initial load.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'framer-motion': ['framer-motion'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['web.torii.local', 'torii.local', 'localhost', '127.0.0.1'],
  },
})
