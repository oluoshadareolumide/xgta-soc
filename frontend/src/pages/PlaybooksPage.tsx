import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/apiClient'
import { usePlaybookEvents, type WSEvent } from '@/hooks/useWebSocket'
import { Card, CardHeader, SectionTitle, ActionButton, Spinner, ErrorState } from '@/components/ui'

const playbooksApi = {
  list: async () => { const { data } = await apiClient.get('/playbooks'); return data },
  execute: async (id: number) => { const { data } = await apiClient.post(`/playbooks/${id}/execute`); return data },
  resume: async (id: number) => { const { data } = await apiClient.post(`/playbooks/${id}/resume`); return data },
  cancel: async (id: number) => { const { data } = await apiClient.post(`/playbooks/${id}/cancel`); return data },
  reset: async (id: number) => { const { data } = await apiClient.post(`/playbooks/${id}/reset`); return data },
}

type StepStatus = 'pending' | 'running' | 'completed' | 'awaiting_manual' | 'skipped' | 'failed'
const STEP_BORDER: Record<StepStatus, string> = { pending:'#1e2535', running:'#38bdf8', completed:'#4ade80', awaiting_manual:'#f5c842', skipped:'#475569', failed:'#ff3b3b' }
const STEP_BG: Record<StepStatus, string> = { pending:'transparent', running:'rgba(56,189,248,0.06)', completed:'rgba(74,222,128,0.06)', awaiting_manual:'rgba(245,200,66,0.06)', skipped:'transparent', failed:'rgba(255,59,59,0.06)' }
const STEP_ICON: Record<StepStatus, string> = { pending:'○', running:'⟳', completed:'✓', awaiting_manual:'⏸', skipped:'↷', failed:'✗' }

export default function PlaybooksPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | null>(null)
  const [stepStates, setStepStates] = useState<Record<string, Record<number, { status: StepStatus; progress_pct: number }>>>({})
  const [liveProgress, setLiveProgress] = useState<Record<string, number>>({})

  const { data: playbooks, isLoading, error } = useQuery({ queryKey: ['playbooks'], queryFn: playbooksApi.list, refetchInterval: 5000 })

  const handlePlaybookEvent = useCallback((event: WSEvent) => {
    const { type, data } = event
    const pbId: string = data.playbook_id
    if (type === 'playbook.step') {
      setStepStates(prev => ({ ...prev, [pbId]: { ...(prev[pbId] ?? {}), [data.step_index]: { status: data.status, progress_pct: data.progress_pct } } }))
      setLiveProgress(prev => ({ ...prev, [pbId]: data.progress_pct }))
    }
    if (type === 'playbook.completed') { setLiveProgress(prev => ({ ...prev, [pbId]: 100 })); queryClient.invalidateQueries({ queryKey: ['playbooks'] }) }
    if (['playbook.started','playbook.failed'].includes(type)) queryClient.invalidateQueries({ queryKey: ['playbooks'] })
  }, [queryClient])

  usePlaybookEvents(handlePlaybookEvent)

  const execMut = useMutation({ mutationFn: playbooksApi.execute, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playbooks'] }) })
  const resumeMut = useMutation({ mutationFn: playbooksApi.resume, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playbooks'] }) })
  const cancelMut = useMutation({ mutationFn: playbooksApi.cancel, onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['playbooks'] }); const pb = playbooks?.find((p: any) => p.id === id); if (pb) { setStepStates(prev => ({ ...prev, [pb.playbook_id]: {} })); setLiveProgress(prev => ({ ...prev, [pb.playbook_id]: 0 })) } } })
  const resetMut = useMutation({ mutationFn: playbooksApi.reset, onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['playbooks'] }); const pb = playbooks?.find((p: any) => p.id === id); if (pb) { setStepStates(prev => ({ ...prev, [pb.playbook_id]: {} })); setLiveProgress(prev => ({ ...prev, [pb.playbook_id]: 0 })) } } })

  const selectedPB = playbooks?.find((p: any) => p.id === selected)

  if (isLoading) return <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
  if (error) return <ErrorState message="Failed to load playbooks" />

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {playbooks?.some((p: any) => p.is_running) && (
        <div style={{ marginBottom: 16, padding: '10px 20px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', animation: 'blink 1s infinite' }} />
          <span style={{ fontSize: 12, color: '#38bdf8' }}>{playbooks.filter((p: any) => p.is_running).map((p: any) => p.name).join(', ')} — executing</span>
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>Live step updates via WebSocket</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedPB ? '1fr 400px' : '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: selectedPB ? '1fr' : '1fr 1fr', gap: 16, alignContent: 'start' }}>
          {playbooks?.map((pb: any) => {
            const isRunning = pb.is_running || pb.status === 'running'
            const isDone = pb.status === 'completed'
            const isFailed = pb.status === 'failed'
            const progress = liveProgress[pb.playbook_id] ?? (isDone ? 100 : 0)
            const states = stepStates[pb.playbook_id] ?? {}
            const awaitingManual = Object.values(states).some((s: any) => s.status === 'awaiting_manual')
            const statusColor = isDone ? '#4ade80' : isFailed ? '#ff3b3b' : isRunning ? '#38bdf8' : '#64748b'
            const statusLabel = isDone ? 'COMPLETED' : isFailed ? 'FAILED' : isRunning ? (awaitingManual ? '⏸ AWAITING APPROVAL' : '⟳ RUNNING') : 'READY'
            const isSelected = selected === pb.id

            return (
              <div key={pb.id} onClick={() => setSelected(prev => prev === pb.id ? null : pb.id)}
                style={{ background: isSelected ? '#111827' : '#0d1525', border: `1px solid ${isSelected ? '#c084fc44' : '#1e2535'}`, borderRadius: 10, padding: 22, cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0f172a' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#0d1525' }}>

                {isRunning && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: awaitingManual ? 'linear-gradient(90deg,#f5c842,transparent)' : 'linear-gradient(90deg,#7c3aed,#38bdf8,transparent)' }} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{pb.playbook_id}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>{pb.name}</div>
                  </div>
                  <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33`, whiteSpace: 'nowrap' }}>{statusLabel}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                  {[['Steps', pb.total_steps], ['ETA', `${pb.estimated_eta_minutes}m`], ['Auto', `${pb.auto_steps}/${pb.total_steps}`]].map(([k,v]) => (
                    <div key={k} style={{ background: '#111827', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{v}</div>
                      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>{String(k).toUpperCase()}</div>
                    </div>
                  ))}
                </div>

                {(isRunning || isDone || progress > 0) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 5 }}>
                      <span>{awaitingManual ? '⏸ AWAITING APPROVAL' : 'PROGRESS'}</span><span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: 5, background: '#1e2535', borderRadius: 3 }}>
                      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 3, transition: 'width 0.5s ease', background: isDone ? 'linear-gradient(90deg,#166534,#4ade80)' : awaitingManual ? 'linear-gradient(90deg,#78350f,#f5c842)' : 'linear-gradient(90deg,#7c3aed,#38bdf8)', boxShadow: isDone ? '0 0 8px #4ade8066' : '0 0 8px #7c3aed66' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {!isRunning && !isDone && !isFailed && <ActionButton onClick={() => execMut.mutate(pb.id)} style={{ flex: 1 }} disabled={execMut.isPending}>▶ EXECUTE</ActionButton>}
                  {isRunning && !awaitingManual && <ActionButton variant="secondary" onClick={() => cancelMut.mutate(pb.id)} style={{ flex: 1 }}>⏹ CANCEL</ActionButton>}
                  {awaitingManual && <ActionButton onClick={() => resumeMut.mutate(pb.id)} style={{ flex: 1, background: 'linear-gradient(135deg,#78350f,#b45309)' }}>✓ APPROVE STEP</ActionButton>}
                  {(isDone || isFailed) && <ActionButton variant="secondary" onClick={() => resetMut.mutate(pb.id)} style={{ flex: 1 }}>↺ RESET</ActionButton>}
                  <ActionButton variant="secondary" style={{ padding: '9px 14px' }}>EDIT</ActionButton>
                </div>
              </div>
            )
          })}
        </div>

        {selectedPB && (
          <Card style={{ height: 'fit-content', animation: 'fadeIn 0.2s ease' }}>
            <CardHeader>
              <SectionTitle>STEP DETAIL — {selectedPB.playbook_id}</SectionTitle>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
            </CardHeader>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>{selectedPB.name}</div>
              {selectedPB.steps?.map((step: any, i: number) => {
                const state = stepStates[selectedPB.playbook_id]?.[i] ?? { status: 'pending', progress_pct: 0 }
                const s = state.status as StepStatus
                return (
                  <div key={step.id} style={{ display: 'flex', gap: 12, marginBottom: 8, padding: '10px 12px', borderRadius: 8, background: STEP_BG[s], border: `1px solid ${STEP_BORDER[s]}`, transition: 'all 0.3s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: `1px solid ${STEP_BORDER[s]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: STEP_BORDER[s], fontWeight: 700, animation: s === 'running' ? 'spin 1s linear infinite' : 'none' }}>{STEP_ICON[s]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{step.name}</span>
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: step.type === 'auto' ? 'rgba(56,189,248,0.12)' : 'rgba(245,200,66,0.12)', color: step.type === 'auto' ? '#38bdf8' : '#f5c842', border: `1px solid ${step.type === 'auto' ? '#38bdf822' : '#f5c84222'}` }}>{step.type.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{step.description}</div>
                      {s === 'awaiting_manual' && <div style={{ fontSize: 11, color: '#f5c842', marginTop: 4, fontWeight: 700 }}>⏸ Awaiting analyst approval</div>}
                    </div>
                    {step.duration > 0 && <div style={{ fontSize: 10, color: '#334155', flexShrink: 0 }}>~{step.duration}s</div>}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
