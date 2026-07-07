import { create } from 'zustand'
import type { ThemeMode } from '@/types/auth'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolved: 'light' | 'dark'
}

function getStored(): ThemeMode {
  return (localStorage.getItem('themePreference') as ThemeMode) ?? 'system'
}

function computeResolved(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function apply(mode: ThemeMode) {
  const resolved = computeResolved(mode)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  localStorage.setItem('themePreference', mode)
}

export const useTheme = create<ThemeState>((set) => {
  const stored = getStored()
  apply(stored)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = getStored()
    if (current === 'system') {
      apply('system')
      set({ resolved: computeResolved('system') })
    }
  })

  return {
    mode: stored,
    resolved: computeResolved(stored),
    setMode: (mode: ThemeMode) => {
      apply(mode)
      set({ mode, resolved: computeResolved(mode) })
    },
  }
})
