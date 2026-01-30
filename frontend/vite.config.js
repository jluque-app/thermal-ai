// import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    // base44 plugin removed to prevent auto-redirects
    // base44({ ... }),
    react(),
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/analyze': 'http://127.0.0.1:8000',
      '/v1': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  }
});