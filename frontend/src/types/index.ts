// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  role: 'admin' | 'analyst' | 'viewer'
  is_active: boolean
}

export interface Token {
  access_token: string
  token_type: string
  user_id: number
  username: string
  role: string
}

// ── Threat Actors ─────────────────────────────────────────────────────────────

export interface ThreatActor {
  id: number
  actor_id: string
  name: string
  origin: string | null
  sector: string | null
  confidence: number
  is_active: boolean
  ttps: string[] | null
  description: string | null
  last_seen: string | null
  created_at: string
  updated_at: string
}

export interface ThreatActorCreate {
  actor_id: string
  name: string
  origin?: string
  sector?: string
  confidence: number
  is_active?: boolean
  ttps?: string[]
  description?: string
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive'

export interface Alert {
  id: number
  alert_id: string
  title: string
  severity: Severity
  status: AlertStatus
  technique: string | null
  ioc_count: number
  confidence: number
  description: string | null
  ai_summary: string | null
  ai_recommendation: string | null
  ai_impact: string | null
  mitre_tactics: string[] | null
  threat_actor_id: number | null
  assignee_id: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface AlertCreate {
  title: string
  severity: Severity
  technique?: string
  description?: string
  confidence: number
  threat_actor_id?: number
}

export interface AlertUpdate {
  status?: AlertStatus
  severity?: Severity
  assignee_id?: number
  ai_summary?: string
  ai_recommendation?: string
  ai_impact?: string
  mitre_tactics?: string[]
}

export interface AlertStats {
  total: number
  open: number
  critical: number
  resolved: number
  auto_resolved_pct: number
}

// ── IOCs ──────────────────────────────────────────────────────────────────────

export type IOCType = 'IP' | 'Domain' | 'Hash' | 'URL' | 'Email' | 'File'

export interface IOC {
  id: number
  ioc_type: IOCType
  value: string
  hits: number
  is_active: boolean
  confidence: number
  description: string | null
  first_seen: string
  last_seen: string
  threat_actor_id: number | null
  created_at: string
}

export interface IOCCreate {
  ioc_type: IOCType
  value: string
  confidence: number
  description?: string
  threat_actor_id?: number
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
