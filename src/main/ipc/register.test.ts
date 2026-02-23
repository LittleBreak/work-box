import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

describe('IPC Handler 注册', () => {
  beforeEach(() => {
    vi.resetModules()
    // 重新设置 mock，因为 resetModules 会清除 mock 缓存
    vi.mock('electron', () => ({
      ipcMain: {
        handle: vi.fn(),
        on: vi.fn()
      }
    }))
  })

  it('registerIPCHandlers 注册所有领域 handler', async () => {
    const { ipcMain } = await import('electron')
    const { registerIPCHandlers } = await import('./register')

    registerIPCHandlers()

    // 验证注册了具体的通道名（空壳 handler）
    const registeredChannels = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0]
    )
    // Task 1.1 阶段注册所有已定义通道的空壳 handler
    expect(registeredChannels).toContain('fs:readFile')
    expect(registeredChannels).toContain('fs:writeFile')
    expect(registeredChannels).toContain('fs:readDir')
    expect(registeredChannels).toContain('fs:stat')
    expect(registeredChannels).toContain('shell:exec')
    expect(registeredChannels).toContain('ai:chat')
    expect(registeredChannels).toContain('ai:getModels')
    expect(registeredChannels).toContain('plugin:list')
    expect(registeredChannels).toContain('plugin:enable')
    expect(registeredChannels).toContain('plugin:disable')
    expect(registeredChannels).toContain('settings:get')
    expect(registeredChannels).toContain('settings:update')
    expect(registeredChannels).toContain('settings:reset')
  })

  // 错误处理：重复注册应抛错
  it('不允许重复注册同一通道', async () => {
    const { registerIPCHandlers } = await import('./register')
    // 第一次注册成功
    registerIPCHandlers()
    // 第二次注册同样通道应抛出错误
    expect(() => registerIPCHandlers()).toThrow(/already registered|duplicate/i)
  })
})
