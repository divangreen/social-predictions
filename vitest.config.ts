import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'tests/performance/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
