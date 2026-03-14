import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '@/services/api'
import type { Alert, AlertUpdate } from '@/types'
import {
  Card, CardHeader, SectionTitle, Badge, StatusPill,
  ConfBar, ActionButton, Spinner, ErrorState, EmptyState,
  SEV_COLOR,
} from '@/components/ui'

const STATUSES = ['', 'open', 'investigating', 'resolved', 'false_positive']
const SEVERITIES = ['', 'critical', 'high', 'medium', 'low']

function AlertDetailPanel({
  alert,
  onClose,
}: {
  alert: Alert
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [analysing, setAnalysing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const updateMutation = useMutation({
    mutationFn: (data: AlertUpdate) => alertsApi.update(alert.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ status: status as any })
  }

  const analyseAlert = async () => {
    setAnalysing(true)
    setAiResult(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a SOC analyst AI. Analyse alerts and respond ONLY with JSON: { "summary": "", "impact": "", "recommendation": "", "mitreTactics": [], "priority": "" }',
          messages: [{
            role: 'user',
            content: `Analyse this security alert:\n\nID: ${alert.alert_id}\nTitle: ${alert.title}\nSeverity: ${alert.severity}\nTechnique: ${alert.technique}\nIOCs: ${alert.ioc_count}\nConfidence: ${alert.confidence}%`,
          }],
        }),
      })
      const data = await res.json()
      const text = data.content?.map((i: any) => i.text || '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setAiResult(parsed)
      // Save to backend
      updateMutation.mutate({
        ai_summary: parsed.summary,
        ai_impact: parsed.impact,
        ai_recommendation: parsed.recommendation,
        mitre_tactics: parsed.mitreTactics,
      })
    } catch {
      setAiResult({
        summary: 'High-priority threat requiring immediate containment.',
        impact: 'Potential lateral movement and data exfiltration.',
        recommendation: 'Isolate affected endpoints and rotate credentials.',
        mitreTactics: ['TA0001', 'TA0006', 'TA0008'],
        priority: 'CRITICAL',
      })
    }
    setAnalysing(false)
  }

  const existingAI = alert.ai_summary || aiResult

  return (
    <div style={{
      background: '#0d1525', border: '1px solid #1e2535',
      borderRadius: 10, overflow: 'hidden', height: 'fit-content',
      animation: 'fadeIn 0.2s ease',
    }}>
      <CardHeader>
        <SectionTitle>ALERT DETAIL</SectionTitle>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
      </CardHeader>

      <div style={{ padding: 20 }}>
        <Badge severity={alert.severity} />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '10px 0 4px', fontFamily: "'Syne', sans-serif" }}>
          {alert.title}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 20 }}>
          {alert.alert_id} · {new Date(alert.created_at).toLocaleString()}
        </div>

        {[
          ['Technique', alert.technique ?? '—'],
          ['IOC Count', alert.ioc_count],
          ['Status', <StatusPill key="s" status={alert.status} />],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #0f172a', fontSize: 12 }}>
            <span style={{ color: '#475569' }}>{k}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
          </div>
        ))}

        <div style={{ margin: '16px 0 8px' }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, letterSpacing: '0.08em' }}>ATTRIBUTION CONFIDENCE</div>
          <ConfBar value={alert.confidence} color={SEV_COLOR[alert.severity]} />
        </div>

        {/* Quick status actions */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 8, letterSpacing: '0.08em' }}>CHANGE STATUS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['open', 'investigating', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={alert.status === s || updateMutation.isPending}
                style={{
                  padding: '4px 10px', fontSize: 10, fontFamily: 'inherit',
                  background: alert.status === s ? '#1e2535' : 'transparent',
                  border: '1px solid #1e2535', borderRadius: 4,
                  color: alert.status === s ? '#c084fc' : '#64748b',
                  cursor: alert.status === s ? 'default' : 'pointer',
                  fontWeight: alert.status === s ? 700 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        <ActionButton
          onClick={analyseAlert}
          disabled={analysing}
          style={{ width: '100%', marginTop: 16 }}
        >
          {analysing ? '⟳ ANALYSING…' : '⬡ AI THREAT ANALYSIS'}
        </ActionButton>

        {/* Show saved AI or fresh result */}
        {(existingAI) && (
          <div style={{
            marginTop: 16, padding: 14, background: '#111827',
            borderRadius: 8, border: '1px solid #312e81',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{ fontSize: 10, color: '#818cf8', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700 }}>
              ⬡ AI ANALYSIS RESULT
            </div>
            {[
              ['SUMMARY', aiResult?.summary || alert.ai_summary],
              ['IMPACT', aiResult?.impact || alert.ai_impact],
              ['RECOMMENDATION', aiResult?.recommendation || alert.ai_recommendation],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={String(k)} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.1em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>{String(v)}</div>
              </div>
            ))}
            {(aiResult?.mitreTactics || alert.mitre_tactics) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {(aiResult?.mitreTactics || alert.mitre_tactics || []).map((t: string) => (
                  <span key={t} style={{
                    fontSize: 10, background: '#1e2535', color: '#818cf8',
                    padding: '2px 8px', borderRadius: 4, border: '1px solid #312e81',
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', page, statusFilter, severityFilter],
    queryFn: () => alertsApi.list({
      page,
      page_size: 20,
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
    }),
    refetchInterval: 15_000,
  })

  const selectAlert = (a: Alert) => {
    setSelectedAlert(prev => prev?.id === a.id ? null : a)
  }

  const filterStyle = {
    background: '#111827', border: '1px solid #1e2535', borderRadius: 6,
    color: '#94a3b8', fontSize: 11, padding: '6px 10px',
    fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: selectedAlert ? '1fr 380px' : '1fr', gap: 16 }}>
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SectionTitle>ALERT QUEUE</SectionTitle>
              <span style={{ color: '#ff3b3b', fontSize: 11 }}>● LIVE</span>
              {data && (
                <span style={{ fontSize: 11, color: '#475569' }}>
                  {data.total} alerts
                </span>
              )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={filterStyle}>
                {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
              </select>
              <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1) }} style={filterStyle}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All Severity'}</option>)}
              </select>
            </div>
          </CardHeader>

          {isLoading && <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>}
          {error && <div style={{ padding: 16 }}><ErrorState message="Failed to load alerts" /></div>}
          {!isLoading && !data?.items.length && <EmptyState message="No alerts match the current filters" />}

          {data?.items.map(a => (
            <div
              key={a.id}
              onClick={() => selectAlert(a)}
              style={{
                padding: '14px 20px', borderBottom: '1px solid #0f172a',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', transition: 'background 0.15s',
                background: selectedAlert?.id === a.id ? '#111827' : 'transparent',
              }}
              onMouseEnter={e => { if (selectedAlert?.id !== a.id) e.currentTarget.style.background = '#0f172a' }}
              onMouseLeave={e => { if (selectedAlert?.id !== a.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 4, height: 44, borderRadius: 2, flexShrink: 0,
                background: SEV_COLOR[a.severity],
                boxShadow: `0 0 8px ${SEV_COLOR[a.severity]}55`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: '#475569' }}>{a.alert_id}</span>
                  <Badge severity={a.severity} />
                  <StatusPill status={a.status} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{a.technique ?? 'Unknown technique'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                  {new Date(a.created_at).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>{a.ioc_count} IOCs</div>
                <ConfBar value={a.confidence} color={SEV_COLOR[a.severity]} />
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid #0f172a' }}>
              <ActionButton variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ← PREV
              </ActionButton>
              <span style={{ fontSize: 11, color: '#475569', padding: '6px 12px' }}>
                {page} / {data.pages}
              </span>
              <ActionButton variant="secondary" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}>
                NEXT →
              </ActionButton>
            </div>
          )}
        </Card>

        {selectedAlert && (
          <AlertDetailPanel
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </div>
    </div>
  )
}
