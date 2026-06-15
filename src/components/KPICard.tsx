import { KPI, getStatus, getStatusLabel, getStatusColor, getStatusBgColor } from '../types'
import './KPICard.css'

interface Props {
  kpi: KPI
  onValueChange: (id: string, valor: number) => void
}

export default function KPICard({ kpi, onValueChange }: Props) {
  const status = getStatus(kpi.valor, kpi.gatilho)
  const color = getStatusColor(status)
  const bgColor = getStatusBgColor(status)
  const progressWidth = Math.min(kpi.valor, 120) / 120 * 100
  const sliderGradient = `linear-gradient(to right, ${color} 0%, ${color} ${progressWidth}%, var(--track) ${progressWidth}%, var(--track) 100%)`

  const icon = status === 'below' ? '⚠' : status === 'above' ? '★' : '✓'

  return (
    <div className={`kpi-card status-${status}`}>
      <div className="kpi-top">
        <span className="kpi-name">{kpi.name}</span>
        <div className="kpi-badges">
          {kpi.peso !== null && (
            <span className="badge-peso">Peso {kpi.peso}%</span>
          )}
          <span className="badge-gatilho">Gatilho {kpi.gatilho}%</span>
        </div>
      </div>

      <div className="kpi-slider-row">
        <label>Realização</label>
        <input
          type="range"
          min={0}
          max={120}
          step={1}
          value={kpi.valor}
          onChange={(e) => onValueChange(kpi.id, parseInt(e.target.value))}
          style={{ background: sliderGradient }}
        />
        <span className="slider-val" style={{ color }}>
          {kpi.valor}%
        </span>
      </div>

      <div className="progress-wrap">
        <div
          className="progress-bar"
          style={{ width: `${progressWidth}%`, background: color }}
        />
      </div>

      <div className="kpi-status">
        <span className="status-tag" style={{ background: bgColor, color }}>
          {icon} {getStatusLabel(status)}
        </span>
      </div>
    </div>
  )
}
