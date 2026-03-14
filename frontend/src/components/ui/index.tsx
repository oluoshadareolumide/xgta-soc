import React from 'react'
import type { Severity, AlertStatus } from '@/types'

// ── Colours ───────────────────────────────────────────────────────────────────

export const SEV_COLOR: Record<Severity, string> = {
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#f5c842',
  low: '#50fa7b',
}

export const SEV_BG: Record<Severity, string> = {
  critical: 'rgba(255,59,59,0.12)',
  high: 'rgba(255,140,0,0.12)',
  medium: 'rgba(245,200,66,0.12)',
  low: 'rgba(80,250,123,0.12)',
}

const STATUS_COLOR: Record<string, string> = {
  open: '#ff3b3b',
  investigating: '#f5c842',
  resolved: '#4ade80',
  false_positive: '#94a3b8',
  running: '#38bdf8',
  ready: '#64748b',
  completed: '#4ade80',
  failed: '#ff3b3b',
}

// ── Components ────────────────────────────────────────────────────────────────

export function Badge({ severity }: { severity: Severity }) {
  return (
    <span style={{
      background: SEV_BG[severity], color: SEV_COLOR[severity],
      border: `1px solid ${SEV_COLOR[severity]}44`,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {severity}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? '#94a3b8'
  return (
    <span style={{
      background: `${c}18`, color: c, border: `1px solid ${c}33`,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function ConfBar({ value, color = '#c084fc' }: { value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#1e2535', borderRadius: 2 }}>
        <div style={{
          width: `${Math.min(value, 100)}%`, height: '100%',
          background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}88`,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 36 }}>{value}%</span>
    </div>
  )
}

export function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid #334155', borderTopColor: '#c084fc',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export function PulseDot({ color = '#4ade80' }: { color?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: 'blink 1.2s ease-in-out infinite',
    }} />
  )
}

export function Card({
  children, style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0d1525', border: '1px solid #1e2535',
      borderRadius: 10, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({
  children, style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid #1e2535',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
      {children}
    </span>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 12 }}>
      {message}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 20, background: 'rgba(255,59,59,0.08)',
      border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8,
      color: '#ff3b3b', fontSize: 12,
    }}>
      ⚠ {message}
    </div>
  )
}

export function ActionButton({
  children, onClick, disabled, variant = 'primary', style,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  style?: React.CSSProperties
}) {
  const bg = {
    primary: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    secondary: '#111827',
    danger: 'rgba(255,59,59,0.15)',
  }[variant]
  const color = { primary: '#fff', secondary: '#64748b', danger: '#ff3b3b' }[variant]
  const border = { primary: 'none', secondary: '1px solid #1e2535', danger: '1px solid rgba(255,59,59,0.3)' }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 16px', background: bg, border, borderRadius: 6,
        color, fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.06em',
        transition: 'all 0.2s', opacity: disabled ? 0.6 : 1, ...style,
      }}
    >
      {children}
    </button>
  )
}
