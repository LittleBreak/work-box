import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'main',
      include: ['src/main/**/*.test.ts'],
      environment: 'node'
    }
  },
  {
    test: {
      name: 'renderer',
      include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
      environment: 'jsdom'
    }
  }
])
