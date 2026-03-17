import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actorsApi } from '@/services/api'
import type { ThreatActorCreate } from '@/types'
import {
  Card, CardHeader, SectionTitle, ConfBar,
  ActionButton, Spinner, ErrorState, EmptyState, PulseDot,
} from '@/components/ui'

function CreateActorModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ThreatActorCreate>({
    actor_id: '', name: '', confidence: 50, is_active: true,
    origin: '', sector: '', ttps: [], description: '',
  })
  const [ttpsInput, setTtpsInput] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: actorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] })
      onClose()
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to create actor'),
  })

  const handleSubmit = () => {
    if (!form.actor_id || !form.name) { setError('Actor ID and Name are required'); return }
    const ttps = ttpsInput.split(',').map(t => t.trim()).filter(Boolean)
    mutation.mutate({ ...form, ttps })
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: '#111827',
    border: '1px solid #1e2535', borderRadius: 6, color: '#e2e8f0',
    fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 10, color: '#64748b', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#0d1525', border: '1px solid #1e2535',
        borderRadius: 12, width: 480, padding: 28, animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>
            New Threat Actor
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>ACTOR ID *</label>
            <input value={form.actor_id} onChange={e => setForm(f => ({ ...f, actor_id: e.target.value }))} style={inputStyle} placeholder="TA005" />
          </div>
          <div>
            <label style={labelStyle}>NAME *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Fancy Bear" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>ORIGIN (country code)</label>
            <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} style={inputStyle} placeholder="RU" />
          </div>
          <div>
            <label style={labelStyle}>TARGET SECTOR</label>
            <input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} style={inputStyle} placeholder="Government" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>CONFIDENCE (0–100)</label>
          <input type="number" min={0} max={100} value={form.confidence}
            onChange={e => setForm(f => ({ ...f, confidence: Number(e.target.value) }))} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>TTPs (comma-separated, e.g. T1566, T1078)</label>
          <input value={ttpsInput} onChange={e => setTtpsInput(e.target.value)} style={inputStyle} placeholder="T1566, T1078, T1003" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ ...inputStyle, height: 72, resize: 'vertical' }} />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#ff3b3b' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <ActionButton variant="secondary" onClick={onClose}>CANCEL</ActionButton>
          <ActionButton onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? '⟳ SAVING…' : '+ CREATE ACTOR'}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

export default function ActorsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [activeOnly, setActiveOnly] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['actors', activeOnly],
    queryFn: () => actorsApi.list({ page_size: 50, active_only: activeOnly }),
    refetchInterval: 30_000,
  })

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {showCreate && <CreateActorModal onClose={() => setShowCreate(false)} />}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveOnly(false)}
            style={{
              padding: '6px 14px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
              background: !activeOnly ? '#1e2535' : 'transparent',
              border: '1px solid #1e2535', borderRadius: 6,
              color: !activeOnly ? '#c084fc' : '#64748b',
            }}
          >ALL</button>
          <button
            onClick={() => setActiveOnly(true)}
            style={{
              padding: '6px 14px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
              background: activeOnly ? '#1e2535' : 'transparent',
              border: '1px solid #1e2535', borderRadius: 6,
              color: activeOnly ? '#ff3b3b' : '#64748b',
            }}
          >ACTIVE ONLY</button>
        </div>
        <ActionButton onClick={() => setShowCreate(true)}>+ NEW ACTOR</ActionButton>
      </div>

      {isLoading && <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner /></div>}
      {error && <ErrorState message="Failed to load threat actors" />}
      {!isLoading && !data?.items.length && <EmptyState message="No threat actors found" />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {data?.items.map(a => (
          <div key={a.id} style={{
            background: '#0d1525',
            border: `1px solid ${a.is_active ? '#1e2535' : '#0f172a'}`,
            borderRadius: 10, padding: 22, position: 'relative', overflow: 'hidden',
          }}>
            {a.is_active && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, #c084fc, #818cf8, transparent)',
              }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                  {a.actor_id} · {a.origin ?? '??'} · {a.sector ?? 'Unknown sector'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {a.is_active && <PulseDot color="#ff3b3b" />}
                <span style={{ fontSize: 10, color: a.is_active ? '#ff3b3b' : '#475569' }}>
                  {a.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 5, letterSpacing: '0.08em' }}>
                ATTRIBUTION CONFIDENCE
              </div>
              <ConfBar value={a.confidence} color="#c084fc" />
            </div>

            {a.ttps && a.ttps.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, letterSpacing: '0.08em' }}>KNOWN TTPs</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {a.ttps.map(t => (
                    <span key={t} style={{
                      fontSize: 10, background: '#1e2535', color: '#94a3b8',
                      padding: '3px 8px', borderRadius: 4, border: '1px solid #334155',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {a.description && (
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                {a.description}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#334155' }}>
              {a.last_seen ? `Last seen: ${new Date(a.last_seen).toLocaleDateString()}` : `Added: ${new Date(a.created_at).toLocaleDateString()}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
