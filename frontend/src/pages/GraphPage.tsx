import { useState, useEffect } from 'react'
import { Card, CardHeader, SectionTitle, ConfBar } from '@/components/ui'

const GRAPH_NODES = [
  { id: 'n1', label: '185.220.101.47',  type: 'ip',     x: 200, y: 140 },
  { id: 'n2', label: 'APT-29',          type: 'actor',  x: 400, y: 80  },
  { id: 'n3', label: 'T1078',           type: 'ttp',    x: 580, y: 160 },
  { id: 'n4', label: 'Workstation-07',  type: 'asset',  x: 340, y: 240 },
  { id: 'n5', label: 'microsofft.com',  type: 'domain', x: 140, y: 260 },
  { id: 'n6', label: 'Cred-Dump.exe',   type: 'file',   x: 490, y: 290 },
  { id: 'n7', label: 'DC-01',           type: 'asset',  x: 620, y: 300 },
]

const GRAPH_EDGES = [
  { from: 'n1', to: 'n2', label: 'attributed' },
  { from: 'n2', to: 'n3', label: 'uses'       },
  { from: 'n1', to: 'n5', label: 'resolves'   },
  { from: 'n3', to: 'n4', label: 'targets'    },
  { from: 'n4', to: 'n6', label: 'executed'   },
  { from: 'n6', to: 'n7', label: 'pivots to'  },
  { from: 'n5', to: 'n4', label: 'C2 beacon'  },
]

const NODE_COLOR: Record<string, string> = {
  ip: '#ff3b3b', actor: '#c084fc', ttp: '#f5c842',
  asset: '#38bdf8', domain: '#fb923c', file: '#4ade80',
}

function ThreatGraph() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 2000)
    return () => clearInterval(t)
  }, [])

  const isPulsing = (id: string) => (tick % GRAPH_NODES.length) === GRAPH_NODES.findIndex(n => n.id === id)

  return (
    <div style={{ position: 'relative', width: '100%', height: 380 }}>
      <svg width="100%" height="100%" viewBox="0 0 760 380" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#334155" />
          </marker>
          {GRAPH_NODES.map(n => (
            <radialGradient key={`g-${n.id}`} id={`grad-${n.id}`}>
              <stop offset="0%" stopColor={NODE_COLOR[n.type]} stopOpacity="0.3" />
              <stop offset="100%" stopColor={NODE_COLOR[n.type]} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {GRAPH_EDGES.map((e, i) => {
          const from = GRAPH_NODES.find(n => n.id === e.from)!
          const to = GRAPH_NODES.find(n => n.id === e.to)!
          const isHighlighted = selected && (selected === e.from || selected === e.to)
          return (
            <g key={i}>
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isHighlighted ? '#c084fc' : '#334155'}
                strokeWidth={isHighlighted ? 2 : 1.5}
                markerEnd="url(#arrow)"
                style={{ transition: 'stroke 0.2s' }}
              />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                fill={isHighlighted ? '#818cf8' : '#475569'}
                fontSize={9} textAnchor="middle"
                fontFamily="'Space Mono', monospace">{e.label}</text>
            </g>
          )
        })}

        {/* Nodes */}
        {GRAPH_NODES.map(n => {
          const isHov = hovered === n.id
          const isSel = selected === n.id
          const c = NODE_COLOR[n.type]
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(prev => prev === n.id ? null : n.id)}
              style={{ cursor: 'pointer' }}>
              {isPulsing(n.id) && (
                <circle r={30} fill={`url(#grad-${n.id})`}>
                  <animate attributeName="r" from="18" to="44" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={isSel ? 26 : isHov ? 22 : 18}
                fill={`${c}22`}
                stroke={c}
                strokeWidth={isSel ? 3 : isHov ? 2.5 : 1.5}
                style={{ transition: 'all 0.2s', filter: (isHov || isSel) ? `drop-shadow(0 0 10px ${c})` : 'none' }}
              />
              <text textAnchor="middle" dy="4" fontSize={8} fill={c} fontWeight={700}
                fontFamily="'Space Mono', monospace">{n.type.toUpperCase()}</text>
              <text textAnchor="middle" dy={36} fontSize={9} fill="#94a3b8"
                fontFamily="'Space Mono', monospace" style={{ pointerEvents: 'none' }}>
                {n.label.length > 16 ? n.label.slice(0, 14) + '…' : n.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Selected node info */}
      {selected && (() => {
        const node = GRAPH_NODES.find(n => n.id === selected)!
        const connectedEdges = GRAPH_EDGES.filter(e => e.from === selected || e.to === selected)
        return (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: '#111827', border: '1px solid #1e2535',
            borderRadius: 8, padding: '12px 16px', minWidth: 200,
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, letterSpacing: '0.08em' }}>
              SELECTED NODE
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: NODE_COLOR[node.type], marginBottom: 4 }}>
              {node.label}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
              Type: {node.type.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: '#475569' }}>
              {connectedEdges.length} connection{connectedEdges.length !== 1 ? 's' : ''}
            </div>
          </div>
        )
      })()}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {Object.entries(NODE_COLOR).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GraphPage() {
  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <Card style={{ marginBottom: 16 }}>
        <CardHeader>
          <SectionTitle>HETEROGENEOUS THREAT KNOWLEDGE GRAPH</SectionTitle>
          <span style={{ fontSize: 10, color: '#475569' }}>
            APT-29 Cozy Bear Campaign — Click nodes to explore
          </span>
        </CardHeader>
        <div style={{ padding: 24 }}>
          <ThreatGraph />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Graph stats */}
        <Card>
          <CardHeader><SectionTitle>GRAPH STATISTICS</SectionTitle></CardHeader>
          <div style={{ padding: 16 }}>
            {[
              ['Nodes', '1,247'], ['Edges', '4,831'], ['IoC Nodes', '892'],
              ['Actor Nodes', '47'], ['TTP Nodes', '308'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #0f172a', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* XAI explanation */}
        <Card>
          <CardHeader><SectionTitle>XAI EXPLANATION</SectionTitle></CardHeader>
          <div style={{ padding: 16 }}>
            {[
              ['Top Feature', 'IP → Domain → TTP chain'],
              ['Attribution Path', '3 hops'],
              ['Confidence Delta', '+12.4%'],
              ['Explainability', '91% coverage'],
              ['Model Type', 'HetGNN'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #0f172a', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Attribution confidence */}
        <Card>
          <CardHeader><SectionTitle>ATTRIBUTION SCORES</SectionTitle></CardHeader>
          <div style={{ padding: 16 }}>
            {[
              { label: 'APT-29 Cozy Bear', value: 94, color: '#c084fc' },
              { label: 'Sandworm',          value: 31, color: '#ff3b3b' },
              { label: 'Lazarus Group',     value: 12, color: '#38bdf8' },
              { label: 'FIN7',              value: 7,  color: '#fb923c' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{m.label}</div>
                <ConfBar value={m.value} color={m.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
