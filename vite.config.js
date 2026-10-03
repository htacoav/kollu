import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Polling makes hot-reload reliable when the source lives on a
    // bind-mounted volume inside Docker (common on macOS/Windows).
    watch: { usePolling: true, interval: 100 },
  },
})
