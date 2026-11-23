import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    allowedHosts: ['localhost', '127.0.0.1'],
    proxy: { '/ws': { target: 'ws://127.0.0.1:8791', ws: true } },
    watch: {
      usePolling: false, // Native Windows filesystem watching.
    }
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
          if (id.includes('@dimforge/rapier3d') || id.includes('rapier')) {
            return 'rapier-vendor';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/zustand') ||
            id.includes('node_modules/lucide-react')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
