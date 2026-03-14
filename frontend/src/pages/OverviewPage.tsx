import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { alertsApi, actorsApi } from '@/services/api'
import {
  Card, CardHeader, SectionTitle, Badge, StatusPill,
  ConfBar, ErrorState, Spinner,
} from '@/components/ui'

const KPI_METRICS = [
  { label: 'Model Attribution Accuracy', value: '94.3%',  sub: '+2.1% vs baseline',   color: '#c084fc', icon: '◈' },
  { label: 'MTTR Reduction',              value: '67%',    sub: 'vs manual response',   color: '#38bdf8', icon: '⟳' },
  { label: 'Active IOCs',                 value: '1,247',  sub: 'across 4 actors',      color: '#fb923c', icon: '◉' },
  { label: 'Auto-Resolved',               value: '83%',    sub: 'this shift',            color: '#4ade80', icon: '✓' },
]

const MODEL_METRICS = [
  { label: 'Attribution Accuracy', value: 94, color: '#c084fc' },
  { label: 'False Positive Rate',  value: 6,  color: '#ff3b3b' },
  { label: 'IoC Correlation',      value: 88, color: '#38bdf8' },
  { label: 'XAI Confidence',       value: 91, color: '#4ade80' },
  { label: 'Graph Coverage',       value: 79, color: '#fb923c' },
]

export default function OverviewPage() {
  const navigate = useNavigate()

  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['alerts', 'overview'],
    queryFn: () => alertsApi.list({ page: 1, page_size: 5 }),
    refetchInterval: 15_000,
  })

  const { data: actorsData } = useQuery({
    queryKey: ['actors', 'overview'],
    queryFn: () => actorsApi.list({ page: 1, page_size: 4, active_only: true }),
    refetchInterval: 60_000,
  })

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {KPI_METRICS.map((k, i) => (
          <div key={i} style={{
            background: '#0d1525', border: '1px solid #1e2535',
            borderRadius: 10, padding: 20, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -20, right: -20,
              fontSize: 80, opacity: 0.04, color: k.color,
            }}>{k.icon}</div>
            <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em', marginBottom: 8 }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, color: k.color,
              fontFamily: "'Syne', sans-serif", lineHeight: 1,
            }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Recent alerts */}
        <Card>
          <CardHeader>
            <SectionTitle>RECENT ALERTS</SectionTitle>
            <button
              onClick={() => navigate('/alerts')}
              style={{ fontSize: 10, color: '#c084fc', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              VIEW ALL →
            </button>
          </CardHeader>

          {alertsLoading && (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          )}
          {alertsError && <div style={{ padding: 16 }}><ErrorState message="Failed to load alerts" /></div>}

          {alertsData?.items.map(a => (
            <div
              key={a.id}
              onClick={() => navigate('/alerts')}
              style={{
                padding: '12px 20px', borderBottom: '1px solid #0f172a',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#111827')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 4, height: 36, borderRadius: 2, flexShrink: 0,
                background: a.severity === 'critical' ? '#ff3b3b' : a.severity === 'high' ? '#ff8c00' : a.severity === 'medium' ? '#f5c842' : '#50fa7b',
                boxShadow: `0 0 8px currentColor`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                  {a.technique ?? 'Unknown technique'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <Badge severity={a.severity} />
                <StatusPill status={a.status} />
              </div>
            </div>
          ))}

          {!alertsLoading && !alertsData?.items.length && (
            <div style={{ padding: 32, textAlign: 'center', color: '#334155', fontSize: 12 }}>
              No alerts found
            </div>
          )}
        </Card>

        {/* Model performance */}
        <Card>
          <CardHeader><SectionTitle>MODEL PERFORMANCE</SectionTitle></CardHeader>
          <div style={{ padding: 20 }}>
            {MODEL_METRICS.map((m, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{m.label}</div>
                <ConfBar value={m.value} color={m.color} />
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 12, background: '#111827', borderRadius: 8, border: '1px solid #1e2535' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, letterSpacing: '0.08em' }}>FRAMEWORK</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
                GNN + Knowledge Graph + XAI<br />
                MITRE ATT&CK · STIX 2.1<br />
                Heterogeneous multi-layer graph
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Active actors summary */}
      {actorsData?.items && actorsData.items.length > 0 && (
        <Card>
          <CardHeader>
            <SectionTitle>ACTIVE THREAT ACTORS</SectionTitle>
            <button
              onClick={() => navigate('/actors')}
              style={{ fontSize: 10, color: '#c084fc', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              VIEW ALL →
            </button>
          </CardHeader>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {actorsData.items.map((a, i) => (
              <div key={a.id} style={{
                padding: '16px 20px',
                borderRight: i < actorsData.items.length - 1 ? '1px solid #0f172a' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3b3b', animation: 'blink 1.2s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>
                  {a.origin} · {a.sector}
                </div>
                <ConfBar value={a.confidence} color="#c084fc" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
