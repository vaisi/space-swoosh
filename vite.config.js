// vite.config.js
// Changes: dropped the homescreen BUILD stamp incrementer. Production
// builds no longer write or bump src/core/buildStamp.js.
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true
  }
})
