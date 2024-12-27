import { defineConfig } from 'vite'

export default defineConfig({
  base: '/space-swoosh/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true
  }
}) 