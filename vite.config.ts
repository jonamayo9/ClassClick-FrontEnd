import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync, existsSync } from 'fs'

const versionFile = path.resolve(__dirname, '.app-version')
const appVersion = existsSync(versionFile)
  ? readFileSync(versionFile, 'utf-8').trim()
  : process.env.GITHUB_SHA
    ? process.env.GITHUB_SHA.slice(0, 7)
    : Date.now().toString(36)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
