import { resolve } from 'path'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    test: {
      name: 'main',
      include: ['src/main/**/*.test.ts'],
      environment: 'node'
    }
  },
  {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    test: {
      name: 'renderer',
      include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
      environment: 'jsdom'
    }
  }
])
