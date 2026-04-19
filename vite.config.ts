import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), removeConsole({
      external: ['error', 'warn']
    })],
  build: {
    // target esnext + terser minifier → skips the vite:esbuild-transpile
    // renderChunk pass entirely, which avoids the Windows esbuild IPC pipe
    // temp-file cleanup error ("remove AppData/Temp/esbuild-xxx: Access is denied")
    target: 'esnext',
    minify: 'terser',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['web.torii.local', 'torii.local', 'localhost', '127.0.0.1'],
  },
})
