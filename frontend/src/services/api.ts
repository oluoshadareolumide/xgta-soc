import { apiClient } from './apiClient'
import type {
  Token, User,
  Alert, AlertCreate, AlertUpdate, AlertStats,
  ThreatActor, ThreatActorCreate,
  IOC, IOCCreate,
  PaginatedResponse,
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (username: string, password: string): Promise<Token> => {
    const form = new URLSearchParams({ username, password })
    const { data } = await apiClient.post<Token>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  register: async (payload: { username: string; email: string; password: string; full_name?: string; role?: string }): Promise<User> => {
    const { data } = await apiClient.post<User>('/auth/register', payload)
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: async (params?: { page?: number; page_size?: number; status?: string; severity?: string; actor_id?: number }): Promise<PaginatedResponse<Alert>> => {
    const { data } = await apiClient.get('/alerts', { params })
    return data
  },

  stats: async (): Promise<AlertStats> => {
    const { data } = await apiClient.get('/alerts/stats')
    return data
  },

  get: async (id: number): Promise<Alert> => {
    const { data } = await apiClient.get(`/alerts/${id}`)
    return data
  },

  create: async (payload: AlertCreate): Promise<Alert> => {
    const { data } = await apiClient.post('/alerts', payload)
    return data
  },

  update: async (id: number, payload: AlertUpdate): Promise<Alert> => {
    const { data } = await apiClient.patch(`/alerts/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/alerts/${id}`)
  },
}

// ── Threat Actors ─────────────────────────────────────────────────────────────

export const actorsApi = {
  list: async (params?: { page?: number; page_size?: number; active_only?: boolean }): Promise<PaginatedResponse<ThreatActor>> => {
    const { data } = await apiClient.get('/threat-actors', { params })
    return data
  },

  get: async (id: number): Promise<ThreatActor> => {
    const { data } = await apiClient.get(`/threat-actors/${id}`)
    return data
  },

  create: async (payload: ThreatActorCreate): Promise<ThreatActor> => {
    const { data } = await apiClient.post('/threat-actors', payload)
    return data
  },

  update: async (id: number, payload: Partial<ThreatActorCreate>): Promise<ThreatActor> => {
    const { data } = await apiClient.patch(`/threat-actors/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/threat-actors/${id}`)
  },
}

// ── IOCs ──────────────────────────────────────────────────────────────────────

export const iocApi = {
  list: async (params?: { page?: number; page_size?: number; ioc_type?: string; actor_id?: number; active_only?: boolean }): Promise<PaginatedResponse<IOC>> => {
    const { data } = await apiClient.get('/iocs', { params })
    return data
  },

  search: async (value: string): Promise<{ found: boolean; ioc?: IOC }> => {
    const { data } = await apiClient.get('/iocs/search', { params: { value } })
    return data
  },

  get: async (id: number): Promise<IOC> => {
    const { data } = await apiClient.get(`/iocs/${id}`)
    return data
  },

  create: async (payload: IOCCreate): Promise<IOC> => {
    const { data } = await apiClient.post('/iocs', payload)
    return data
  },

  bulkCreate: async (iocs: IOCCreate[]): Promise<{ created: number; items: IOC[] }> => {
    const { data } = await apiClient.post('/iocs/bulk', iocs)
    return data
  },

  update: async (id: number, payload: Partial<IOCCreate & { hits: number; is_active: boolean }>): Promise<IOC> => {
    const { data } = await apiClient.patch(`/iocs/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/iocs/${id}`)
  },
}
