import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppLayout } from './AppLayout'
import { useAppStore, initialAppState } from '../../stores/app.store'

describe('AppLayout', () => {
  beforeEach(() => {
    useAppStore.setState(initialAppState)
    // SettingsView 需要 window.workbox.settings
    Object.defineProperty(window, 'workbox', {
      value: {
        settings: {
          get: vi.fn().mockResolvedValue({
            theme: 'dark',
            language: 'zh',
            aiProvider: 'openai',
            aiApiKey: '',
            aiBaseUrl: 'https://api.openai.com/v1',
            aiModel: 'gpt-4o',
            aiTemperature: 0.7,
            pluginDir: '~/.workbox/plugins'
          }),
          update: vi.fn().mockResolvedValue(undefined),
          reset: vi.fn().mockResolvedValue(undefined)
        }
      },
      writable: true,
      configurable: true
    })
  })

  // 正常路径
  it('渲染侧边栏和内容区域', () => {
    render(<AppLayout />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  // 页面切换：根据 currentPage 渲染对应组件
  it('默认渲染 Home 页面', () => {
    render(<AppLayout />)
    expect(screen.getByTestId('page-home')).toBeInTheDocument()
  })

  it('currentPage 为 chat 时渲染 ChatView', () => {
    useAppStore.setState({ currentPage: 'chat' })
    render(<AppLayout />)
    expect(screen.getByTestId('page-chat')).toBeInTheDocument()
  })

  it('currentPage 为 plugins 时渲染 PluginListView', () => {
    useAppStore.setState({ currentPage: 'plugins' })
    render(<AppLayout />)
    expect(screen.getByTestId('page-plugins')).toBeInTheDocument()
  })

  it('currentPage 为 settings 时渲染 SettingsView', () => {
    useAppStore.setState({ currentPage: 'settings' })
    render(<AppLayout />)
    expect(screen.getByTestId('page-settings')).toBeInTheDocument()
  })
})
