
import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
 
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    watch: false, // Disable watch mode by default
    coverage: {
      exclude: [
        'docs/inspo/sandbox/**',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        'scripts/**',
        '.next/**',
        '.taskmaster/**',
        '.specstory/**',
        'exports/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
