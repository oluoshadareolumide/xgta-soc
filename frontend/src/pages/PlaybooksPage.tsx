import { useState, useEffect } from 'react'
import { Card, CardHeader, SectionTitle, StatusPill, ActionButton } from '@/components/ui'

// Playbooks will be wired to backend in Batch 3 (WebSocket + Playbooks engine)
// For now, static data with simulated execution
const PLAYBOOKS_DATA = [
  { id: 'PB-01', name: 'Credential Theft Response',   steps: 7, eta: '12 min', auto: 5, manual: 2, status: 'ready',   description: 'Responds to credential dumping and theft attempts. Isolates affected accounts and rotates secrets.' },
  { id: 'PB-02', name: 'Ransomware Containment',      steps: 9, eta: '8 min',  auto: 7, manual: 2, status: 'running', description: 'Emergency containment playbook for ransomware pre-stage and active encryption events.' },
  { id: 'PB-03', name: 'Lateral Movement Quarantine', steps: 6, eta: '15 min', auto: 4, manual: 2, status: 'ready',   description: 'Detects and quarantines lateral movement attempts across internal network segments.' },
  { id: 'PB-04', name: 'C2 Traffic Disruption',       steps: 5, eta: '6 min',  auto: 5, manual: 0, status: 'ready',   description: 'Automatically blocks C2 communication channels and blackholes associated IPs and domains.' },
]

type PBProgress = Record<string, number>

export default function PlaybooksPage() {
  const [progress, setProgress] = useState<PBProgress>({})
  const [running, setRunning] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // Auto-progress PB-02 on mount (it's already "running")
  useEffect(() => {
    setProgress({ 'PB-02': 42 })
    setRunning('PB-02')
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = (prev['PB-02'] ?? 42) + Math.random() * 3
        if (next >= 100) {
          clearInterval(interval)
          setRunning(null)
          return { ...prev, 'PB-02': 100 }
        }
        return { ...prev, 'PB-02': next }
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  const executePlaybook = (pbId: string) => {
    if (running) return
    setRunning(pbId)
    setProgress(p => ({ ...p, [pbId]: 0 }))
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = (prev[pbId] ?? 0) + Math.random() * 10
        if (next >= 100) {
          clearInterval(interval)
          setRunning(null)
          return { ...prev, [pbId]: 100 }
        }
        return { ...prev, [pbId]: next }
      })
    }, 300)
  }

  const selectedPB = PLAYBOOKS_DATA.find(p => p.id === selected)
  const prog = (id: string) => Math.min(progress[id] ?? 0, 100)
  const isDone = (id: string) => prog(id) >= 100
  const isRunning = (id: string) => running === id

  const getStatus = (pb: typeof PLAYBOOKS_DATA[0]) => {
    if (isDone(pb.id)) return 'completed'
    if (isRunning(pb.id)) return 'running'
    return pb.status as any
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      {running && (
        <div style={{
          marginBottom: 16, padding: '12px 20px',
          background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, color: '#38bdf8' }}>
            ⟳ Playbook {running} executing…
          </span>
          <div style={{ flex: 1, height: 4, background: '#1e2535', borderRadius: 2 }}>
            <div style={{
              width: `${prog(running)}%`, height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
              borderRadius: 2, transition: 'width 0.3s',
              boxShadow: '0 0 8px #7c3aed66',
            }} />
          </div>
          <span style={{ fontSize: 11, color: '#38bdf8', minWidth: 40 }}>{Math.round(prog(running))}%</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedPB ? '1fr 360px' : '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: selectedPB ? '1fr' : '1fr 1fr', gap: 16, alignContent: 'start' }}>
          {PLAYBOOKS_DATA.map(pb => {
            const done = isDone(pb.id)
            const run = isRunning(pb.id)
            const p = prog(pb.id)

            return (
              <div
                key={pb.id}
                onClick={() => setSelected(prev => prev === pb.id ? null : pb.id)}
                style={{
                  background: selected === pb.id ? '#111827' : '#0d1525',
                  border: `1px solid ${selected === pb.id ? '#c084fc44' : '#1e2535'}`,
                  borderRadius: 10, padding: 22, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selected !== pb.id) e.currentTarget.style.background = '#0f172a' }}
                onMouseLeave={e => { if (selected !== pb.id) e.currentTarget.style.background = '#0d1525' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{pb.id}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>
                      {pb.name}
                    </div>
                  </div>
                  <StatusPill status={getStatus(pb)} />
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {[['Steps', pb.steps], ['ETA', pb.eta], ['Auto', `${pb.auto}/${pb.steps}`]].map(([k, v]) => (
                    <div key={k} style={{ background: '#111827', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{v}</div>
                      <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.08em' }}>{String(k).toUpperCase()}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {(run || done || p > 0) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', marginBottom: 5 }}>
                      <span>EXECUTION PROGRESS</span>
                      <span>{Math.round(p)}%</span>
                    </div>
                    <div style={{ height: 4, background: '#1e2535', borderRadius: 2 }}>
                      <div style={{
                        width: `${p}%`, height: '100%', borderRadius: 2,
                        background: done ? 'linear-gradient(90deg, #166534, #4ade80)' : 'linear-gradient(90deg, #7c3aed, #38bdf8)',
                        transition: 'width 0.3s', boxShadow: done ? '0 0 8px #4ade8066' : '0 0 8px #7c3aed66',
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <ActionButton
                    onClick={() => executePlaybook(pb.id)}
                    disabled={(run && !done) || (!!running && !run)}
                    style={{ flex: 1 }}
                    variant={done ? 'secondary' : 'primary'}
                  >
                    {done ? '✓ COMPLETE' : run ? '⟳ RUNNING…' : '▶ EXECUTE'}
                  </ActionButton>
                  <ActionButton variant="secondary" style={{ padding: '9px 14px' }}>EDIT</ActionButton>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selectedPB && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <Card style={{ height: 'fit-content' }}>
              <CardHeader>
                <SectionTitle>PLAYBOOK DETAIL</SectionTitle>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
              </CardHeader>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>
                  {selectedPB.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                  {selectedPB.description}
                </div>

                {[
                  ['Playbook ID', selectedPB.id],
                  ['Total Steps', selectedPB.steps],
                  ['Automated Steps', `${selectedPB.auto} (${Math.round(selectedPB.auto / selectedPB.steps * 100)}%)`],
                  ['Manual Steps', selectedPB.manual],
                  ['Estimated ETA', selectedPB.eta],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0f172a', fontSize: 12 }}>
                    <span style={{ color: '#475569' }}>{k}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 10, letterSpacing: '0.08em' }}>
                    STEP BREAKDOWN (Batch 3: full step engine)
                  </div>
                  {Array.from({ length: selectedPB.steps }, (_, i) => {
                    const p = prog(selectedPB.id)
                    const stepPct = ((i + 1) / selectedPB.steps) * 100
                    const done = p >= stepPct
                    const active = p >= ((i) / selectedPB.steps) * 100 && !done
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: done ? '#052e16' : active ? '#1e3a5f' : '#111827',
                          border: `1px solid ${done ? '#4ade80' : active ? '#38bdf8' : '#1e2535'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: done ? '#4ade80' : active ? '#38bdf8' : '#334155',
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 11, color: done ? '#4ade80' : active ? '#38bdf8' : '#475569' }}>
                          {i < selectedPB.auto ? `Auto: Step ${i + 1}` : `Manual: Review step ${i + 1}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
