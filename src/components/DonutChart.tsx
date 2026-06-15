import { KPI } from '../types'
import './DonutChart.css'

interface Props {
  kpis: KPI[]
  theme?: string
}

const COLORS = ['#00412e', '#0b5a42', '#236a51', '#8a5100', '#fc9910', '#ffb86e', '#bfc9c2']

const R = 40
const CIRC = 2 * Math.PI * R // ~251.33

export default function DonutChart({ kpis }: Props) {
  const items = kpis.filter(k => k.peso !== null)
  const total = items.reduce((s, k) => s + (k.peso ?? 0), 0)

  let acc = 0
  const segments = items.map((k, i) => {
    const frac = (k.peso ?? 0) / total
    const dash = frac * CIRC
    const offset = -acc * CIRC
    acc += frac
    return { id: k.id, color: COLORS[i % COLORS.length], dash, offset }
  })

  return (
    <div className="panel donut-panel">
      <div className="donut-head">
        <h2 className="panel-title">Pesos e Alocação</h2>
        <p className="donut-sub">Distribuição percentual da carteira de indicadores</p>
      </div>

      <div className="donut-chart">
        <svg viewBox="0 0 100 100" className="donut-svg">
          <circle cx="50" cy="50" r={R} fill="none"
            stroke="var(--m3-surface-container-highest)" strokeWidth={12} />
          {segments.map(s => (
            <circle
              key={s.id}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={12}
              strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <div className="donut-center">
          <span className="donut-total">{total}%</span>
          <span className="donut-total-label">Alocado</span>
        </div>
      </div>

      <div className="donut-legend">
        {items.map((k, i) => (
          <div key={k.id} className="donut-legend-item">
            <span className="donut-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="donut-legend-text">
              {k.name} ({k.peso}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
