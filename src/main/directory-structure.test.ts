import { existsSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '../..')

describe('目录结构', () => {
  // 正常路径：子目录存在
  const requiredDirs = [
    'src/main/ipc',
    'src/main/plugin',
    'src/main/ai',
    'src/main/storage',
    'src/renderer/components',
    'src/renderer/features',
    'src/renderer/stores',
    'src/shared',
    'plugins'
  ]

  it.each(requiredDirs)('目录 %s 存在', (dir) => {
    expect(existsSync(resolve(ROOT, dir))).toBe(true)
  })

  // 正常路径：占位文件存在且可导入
  it('src/shared/ipc-channels.ts 导出 IPC_CHANNELS', async () => {
    const mod = await import('@shared/ipc-channels')
    expect(mod.IPC_CHANNELS).toBeDefined()
  })

  it('src/shared/types.ts 可正常导入', async () => {
    const mod = await import('@shared/types')
    expect(mod).toBeDefined()
  })

  // 正常路径：子目录占位 index.ts 可导入
  it('src/main/ipc/index.ts 可导入', async () => {
    const mod = await import('@main/ipc')
    expect(mod).toBeDefined()
  })

  it('src/main/plugin/index.ts 可导入', async () => {
    const mod = await import('@main/plugin')
    expect(mod).toBeDefined()
  })

  it('src/main/ai/index.ts 可导入', async () => {
    const mod = await import('@main/ai')
    expect(mod).toBeDefined()
  })

  it('src/main/storage/index.ts 可导入', async () => {
    const mod = await import('@main/storage')
    expect(mod).toBeDefined()
  })

  // 边界条件：plugins 目录存在且包含 .gitkeep
  it('plugins 目录存在且包含 .gitkeep', () => {
    expect(existsSync(resolve(ROOT, 'plugins/.gitkeep'))).toBe(true)
  })
})
