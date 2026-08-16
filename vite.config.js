// vite.config.js
// Increments src/core/buildStamp.js on every production build so the
// Capacitor/web home screen stamp changes each time assets are rebuilt.
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const stampPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'src/core/buildStamp.js'
)

function incrementBuildStamp() {
  return {
    name: 'increment-build-stamp',
    apply: 'build',
    config() {
      const src = fs.readFileSync(stampPath, 'utf8')
      const match = src.match(/BUILD_NUMBER\s*=\s*(\d+)/)
      if (!match) return
      const next = Number(match[1]) + 1
      fs.writeFileSync(
        stampPath,
        src.replace(/BUILD_NUMBER\s*=\s*\d+/, `BUILD_NUMBER = ${next}`)
      )
      console.log(`[build] homescreen stamp → BUILD ${next}`)
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [incrementBuildStamp()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true
  }
})
