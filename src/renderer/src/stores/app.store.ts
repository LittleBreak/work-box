import { create } from 'zustand'

export type PageId = 'home' | 'chat' | 'plugins' | 'settings'

export type Theme = 'light' | 'dark'

export interface AppState {
  currentPage: PageId
  sidebarCollapsed: boolean
  theme: Theme
  setCurrentPage: (page: PageId) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: Theme) => void
}

export const initialAppState: Pick<AppState, 'currentPage' | 'sidebarCollapsed' | 'theme'> = {
  currentPage: 'home',
  sidebarCollapsed: false,
  theme: 'dark'
}

export const useAppStore = create<AppState>()((set) => ({
  ...initialAppState,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => set({ theme })
}))
