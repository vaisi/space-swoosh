import { defineConfig } from 'vite'

export default defineConfig({
    base: '/space-swoosh/', // Changed back to match GitHub repo name
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    }
}) 