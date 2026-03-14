import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const token = await authApi.login(username, password)
      localStorage.setItem('access_token', token.access_token)
      set({ token: token.access_token, isAuthenticated: true })
      const user = await authApi.me()
      set({ user })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
