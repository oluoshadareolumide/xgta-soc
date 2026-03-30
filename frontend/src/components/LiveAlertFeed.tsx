import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket, type WSEvent } from '@/hooks/useWebSocket'
import type { Severity } from '@/types'

const SEV_COLOR: Record<string, string> = {
  critical: '#ff3b3b', high: '#ff8c00', medium: '#f5c842', low: '#50fa7b',
}

interface LiveAlert {
  id: string
  alert_id: string
  title: string
  severity: Severity
  technique: string
  ioc_count: number
  _eventType: string
  timestamp: number
}

interface ToastProps {
  alert: LiveAlert
  onDismiss: () => void
}

function AlertToast({ alert, onDismiss }: ToastProps) {
  const color = SEV_COLOR[alert.severity] ?? '#94a3b8'
  const isCritical = alert.severity === 'critical'

  useEffect(() => {
    const t = setTimeout(onDismiss, isCritical ? 8000 : 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      background: '#0d1525',
      border: `1px solid ${color}44`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 8,
      minWidth: 320,
      maxWidth: 380,
      animation: 'slideIn 0.3s ease',
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}11`,
      position: 'relative',
      fontFamily: "'Space Mono', monospace",
    }}>
      {isCritical && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          borderRadius: '8px 8px 0 0',
          animation: 'pulseOpacity 1s ease-in-out infinite',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color, background: `${color}18`,
              border: `1px solid ${color}33`,
              padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase',
            }}>
              {isCritical ? '⚡ ' : ''}{alert.severity}
            </span>
            <span style={{ fontSize: 10, color: '#475569' }}>{alert.alert_id}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.3 }}>
            {alert.title}
          </div>
          <div style={{ fontSize: 10, color: '#475569' }}>
            {alert.technique} · {alert.ioc_count} IOCs
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', color: '#334155',
          cursor: 'pointer', fontSize: 14, flexShrink: 0, lineHeight: 1,
          padding: '2px 4px',
        }}>✕</button>
      </div>

      {/* Progress bar showing time until auto-dismiss */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: '#111827', borderRadius: '0 0 8px 8px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: color, opacity: 0.4,
          animation: `shrink ${isCritical ? 8 : 5}s linear forwards`,
        }} />
      </div>
    </div>
  )
}

export function LiveAlertFeed() {
  const [toasts, setToasts] = useState<LiveAlert[]>([])
  const queryClient = useQueryClient()

  const handleEvent = useCallback((event: WSEvent) => {
    if (event.type === 'alert.created' || event.type === 'alert.critical') {
      const alert: LiveAlert = {
        ...event.data as any,
        _eventType: event.type,
        timestamp: Date.now(),
      }
      setToasts(prev => [alert, ...prev].slice(0, 5)) // max 5 toasts
      // Invalidate alert queries so list refreshes
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
    }
    if (event.type === 'alert.updated') {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    }
  }, [queryClient])

  const { status } = useWebSocket(handleEvent)

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id || t.timestamp !== Number(id)))
  }

  return (
    <>
      {/* WS status indicator (shown in header area) */}
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
        @keyframes pulseOpacity { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end',
      }}>
        {toasts.map((t, i) => (
          <AlertToast
            key={`${t.alert_id}-${t.timestamp}`}
            alert={t}
            onDismiss={() => setToasts(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
    </>
  )
}

// ── WS Status Badge (used in AppShell) ───────────────────────────────────────

export function WSStatusBadge() {
  const [wsStatus, setWsStatus] = useState<string>('disconnected')

  const handleEvent = useCallback((event: WSEvent) => {
    if (event.type === 'connection.established') setWsStatus('connected')
  }, [])

  const { status } = useWebSocket(handleEvent)

  useEffect(() => { setWsStatus(status) }, [status])

  const color = {
    connected: '#4ade80',
    connecting: '#f5c842',
    disconnected: '#475569',
    error: '#ff3b3b',
  }[wsStatus] ?? '#475569'

  const label = {
    connected: 'LIVE',
    connecting: 'CONNECTING',
    disconnected: 'OFFLINE',
    error: 'ERROR',
  }[wsStatus] ?? 'OFFLINE'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: wsStatus === 'connected' ? 'blink 1.2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  )
}
