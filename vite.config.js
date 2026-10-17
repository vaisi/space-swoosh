// vite.config.js
// Changes: swooshtober/index.html is a second Vite entry so GitHub Pages
// serves /swooshtober. Paths use import.meta.url because package.json is
// "type": "module" and __dirname is not defined there.
import { defineConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        swooshtober: resolve(rootDir, 'swooshtober/index.html'),
      },
    },
  },
})
