// vite.config.js
// Changes: about/index.html and how-to-play/index.html are Vite entries so
// GitHub Pages serves /about/ and /how-to-play/ (same pattern as
// /swooshtober/). Paths use import.meta.url because package.json is
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
        about: resolve(rootDir, 'about/index.html'),
        howToPlay: resolve(rootDir, 'how-to-play/index.html'),
      },
    },
  },
})
