import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from './SettingsView'
import { DEFAULT_SETTINGS } from '@shared/types'
import { useAppStore } from '@renderer/stores/app.store'

// Mock window.workbox.settings
const mockGet = vi.fn().mockResolvedValue({ ...DEFAULT_SETTINGS })
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockReset = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  Object.defineProperty(window, 'workbox', {
    value: { settings: { get: mockGet, update: mockUpdate, reset: mockReset } },
    writable: true,
    configurable: true
  })
  mockGet.mockClear()
  mockUpdate.mockClear()
  mockReset.mockClear()
  // 重置 app store
  useAppStore.setState({ theme: 'dark' })
})

describe('SettingsView', () => {
  // 正常路径
  it('渲染设置页面标题', async () => {
    render(<SettingsView />)
    expect(screen.getByText(/设置|settings/i)).toBeInTheDocument()
  })

  // 正常路径：显示 3 个 Tab
  it('显示通用、AI、插件三个 Tab', async () => {
    render(<SettingsView />)
    await waitFor(() => {
      expect(screen.getByText(/通用|general/i)).toBeInTheDocument()
      expect(screen.getByText(/ai/i)).toBeInTheDocument()
      expect(screen.getByText(/插件|plugin/i)).toBeInTheDocument()
    })
  })

  // 正常路径：显示主题选择
  it('显示主题切换选项', async () => {
    render(<SettingsView />)
    await waitFor(() => {
      expect(screen.getByText(/主题|theme/i)).toBeInTheDocument()
    })
  })

  // 正常路径：初始化时调用 settings.get 加载设置
  it('初始化时调用 window.workbox.settings.get()', async () => {
    render(<SettingsView />)
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1)
    })
  })

  // 交互验证：切换暗色模式同步更新 app store
  it('切换主题时更新 appStore.theme', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    // 找到主题切换控件并切换到 light
    const lightOption = await screen.findByRole('radio', { name: /light|亮色/i })
    await user.click(lightOption)
    expect(useAppStore.getState().theme).toBe('light')
  })

  // 交互验证：保存按钮触发 settings.update
  it('点击保存调用 window.workbox.settings.update()', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    const saveBtn = screen.getByRole('button', { name: /保存|save/i })
    await user.click(saveBtn)
    expect(mockUpdate).toHaveBeenCalled()
  })

  // 交互验证：重置按钮触发 settings.reset
  it('点击重置调用 window.workbox.settings.reset()', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    const resetBtn = screen.getByRole('button', { name: /重置|reset/i })
    await user.click(resetBtn)
    expect(mockReset).toHaveBeenCalled()
  })
})
