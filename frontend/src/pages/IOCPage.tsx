import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { iocApi } from '@/services/api'
import type { IOCCreate, IOCType } from '@/types'
import {
  Card, CardHeader, SectionTitle, ActionButton,
  Spinner, ErrorState, EmptyState,
} from '@/components/ui'

const IOC_TYPES: IOCType[] = ['IP', 'Domain', 'Hash', 'URL', 'Email', 'File']
const TYPE_COLOR: Record<string, string> = {
  IP: '#ff3b3b', Domain: '#fb923c', Hash: '#f5c842',
  URL: '#4ade80', Email: '#38bdf8', File: '#c084fc',
}

function AddIOCModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<IOCCreate>({
    ioc_type: 'IP', value: '', confidence: 80, description: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: iocApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iocs'] })
      onClose()
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to create IOC'),
  })

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: '#111827',
    border: '1px solid #1e2535', borderRadius: 6, color: '#e2e8f0',
    fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{ background: '#0d1525', border: '1px solid #1e2535', borderRadius: 12, width: 420, padding: 28, animation: 'fadeIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>Add IOC</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 5 }}>TYPE</label>
          <select value={form.ioc_type} onChange={e => setForm(f => ({ ...f, ioc_type: e.target.value as IOCType }))} style={inputStyle}>
            {IOC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 5 }}>VALUE *</label>
          <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={inputStyle} placeholder="e.g. 185.220.101.47" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 5 }}>CONFIDENCE (0–100)</label>
          <input type="number" min={0} max={100} value={form.confidence}
            onChange={e => setForm(f => ({ ...f, confidence: Number(e.target.value) }))} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
          <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#ff3b3b' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <ActionButton variant="secondary" onClick={onClose}>CANCEL</ActionButton>
          <ActionButton onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? '⟳ SAVING…' : '+ ADD IOC'}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

export default function IOCPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['iocs', typeFilter],
    queryFn: () => iocApi.list({ page_size: 100, ioc_type: typeFilter || undefined, active_only: false }),
    refetchInterval: 30_000,
  })

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    const result = await iocApi.search(search.trim())
    setSearchResult(result)
    setSearching(false)
  }

  const inputStyle = {
    background: '#111827', border: '1px solid #1e2535', borderRadius: 6,
    color: '#e2e8f0', fontSize: 12, padding: '7px 12px',
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {showAdd && <AddIOCModal onClose={() => setShowAdd(false)} />}

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SectionTitle>
              IOC LIBRARY
              {data && <span style={{ color: '#64748b', fontWeight: 400 }}> — {data.total} indicators</span>}
            </SectionTitle>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ display: 'flex', gap: 0 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search indicator value…"
                style={{ ...inputStyle, borderRadius: '6px 0 0 6px', width: 220 }}
              />
              <button onClick={handleSearch} disabled={searching} style={{
                background: '#1e2535', border: '1px solid #1e2535', borderLeft: 'none',
                borderRadius: '0 6px 6px 0', color: '#94a3b8', fontSize: 11,
                padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {searching ? '⟳' : 'SEARCH'}
              </button>
            </div>

            {/* Type filter */}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={inputStyle}>
              <option value="">All Types</option>
              {IOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <ActionButton onClick={() => setShowAdd(true)}>+ ADD IOC</ActionButton>
          </div>
        </CardHeader>

        {/* Search result banner */}
        {searchResult !== null && (
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid #1e2535',
            background: searchResult.found ? 'rgba(192,132,252,0.08)' : 'rgba(255,59,59,0.08)',
          }}>
            {searchResult.found ? (
              <div style={{ fontSize: 12, color: '#c084fc' }}>
                ✓ Found: <strong>{searchResult.ioc?.value}</strong> — {searchResult.ioc?.ioc_type} · {searchResult.ioc?.hits} hits
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#475569' }}>Not found in IOC library — this indicator is clean.</div>
            )}
            <button onClick={() => setSearchResult(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 10, marginLeft: 12 }}>clear</button>
          </div>
        )}

        {isLoading && <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>}
        {error && <div style={{ padding: 16 }}><ErrorState message="Failed to load IOC library" /></div>}
        {!isLoading && !data?.items.length && <EmptyState message="No IOCs found" />}

        {data?.items && data.items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2535' }}>
                {['TYPE', 'INDICATOR', 'CONFIDENCE', 'FIRST SEEN', 'LAST SEEN', 'HITS', 'STATUS'].map(h => (
                  <th key={h} style={{
                    padding: '10px 20px', textAlign: 'left',
                    fontSize: 10, color: '#475569', letterSpacing: '0.1em', fontWeight: 700,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map(ioc => (
                <tr key={ioc.id} style={{ borderBottom: '1px solid #0f172a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: `${TYPE_COLOR[ioc.ioc_type] ?? '#94a3b8'}18`,
                      color: TYPE_COLOR[ioc.ioc_type] ?? '#94a3b8',
                      border: `1px solid ${TYPE_COLOR[ioc.ioc_type] ?? '#94a3b8'}33`,
                    }}>{ioc.ioc_type}</span>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#e2e8f0', fontFamily: "'Space Mono', monospace", maxWidth: 280 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ioc.value}</div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: '#94a3b8' }}>{ioc.confidence}%</td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: '#64748b' }}>{new Date(ioc.first_seen).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: '#64748b' }}>{new Date(ioc.last_seen).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: ioc.hits > 40 ? '#ff3b3b' : ioc.hits > 20 ? '#f5c842' : '#4ade80',
                    }}>{ioc.hits}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: ioc.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(148,163,184,0.1)',
                      color: ioc.is_active ? '#4ade80' : '#475569',
                      border: `1px solid ${ioc.is_active ? '#4ade8033' : '#33415533'}`,
                    }}>
                      {ioc.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
