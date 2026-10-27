import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/TrussIQ/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Prebundle PDF dependencies before the lazy workspace is opened.
    include: ['jspdf', 'html2canvas'],
  },
  build: {
    manifest: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
