import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@/services/api'
import { WSStatusBadge, LiveAlertFeed } from '@/components/LiveAlertFeed'

const TABS = [
  { id: 'overview',   path: '/',               label: 'Overview'      },
  { id: 'alerts',     path: '/alerts',          label: 'Alerts'        },
  { id: 'graph',      path: '/graph',           label: 'Threat Graph'  },
  { id: 'actors',     path: '/actors',          label: 'Threat Actors' },
  { id: 'iocs',       path: '/iocs',            label: 'IOC Library'   },
  { id: 'playbooks',  path: '/playbooks',       label: 'Playbooks'     },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [liveTime, setLiveTime] = useState(new Date())
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: stats } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: alertsApi.stats,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const activeTab = TABS.find(t =>
    t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path)
  )?.id ?? 'overview'

  return (
    <div style={{
      minHeight: '100vh', background: '#070d1a',
      fontFamily: "'Space Mono', 'Courier New', monospace", color: '#e2e8f0',
    }}>
      {/* Scanline overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: '100%', height: 2,
          background: 'linear-gradient(transparent, rgba(192,132,252,0.06), transparent)',
          animation: 'scanline 6s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #1e2535',
        background: 'rgba(7,13,26,0.97)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #c084fc, #818cf8)',
              borderRadius: 6, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16, flexShrink: 0,
            }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.04em', color: '#f1f5f9' }}>
                XGTA-SOC
              </div>
              <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.12em' }}>
                EXPLAINABLE GRAPH THREAT ATTRIBUTION
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <WSStatusBadge />

            <div style={{ fontSize: 11, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {liveTime.toUTCString().replace(' GMT', ' UTC')}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[
                { label: 'CRITICAL', value: stats?.critical ?? '—', color: '#ff3b3b' },
                { label: 'OPEN',     value: stats?.open ?? '—',     color: '#f5c842' },
                { label: 'ACCURACY', value: '94.3%',                color: '#94a3b8' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {i > 0 && <div style={{ width: 1, height: 28, background: '#1e2535' }} />}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* User menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {user?.username ?? '…'}
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'none', border: '1px solid #1e2535', borderRadius: 4,
                  color: '#475569', fontSize: 10, padding: '3px 8px',
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
                }}
              >
                OUT
              </button>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 2 }}>
          {TABS.map(t => {
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                style={{
                  background: isActive ? '#1e2535' : 'transparent',
                  color: isActive ? '#c084fc' : '#64748b',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #c084fc' : '2px solid transparent',
                  padding: '10px 18px', fontSize: 11, cursor: 'pointer',
                  letterSpacing: '0.06em', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {t.label.toUpperCase()}
              </button>
            )
          })}
        </div>
      </header>

      {/* Page content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        {children}
      </main>

      <footer style={{
        position: 'relative', zIndex: 1, borderTop: '1px solid #0f172a',
        padding: '12px 24px', maxWidth: 1400, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#1e2535' }}>XGTA-SOC v3.0 · FastAPI + SQL Server + React + WebSocket</span>
        <span style={{ fontSize: 10, color: '#1e2535' }}>GNN + XAI + Knowledge Graph Framework</span>
      </footer>

      {/* Global live alert toast feed */}
      <LiveAlertFeed />
    </div>
  )
}
