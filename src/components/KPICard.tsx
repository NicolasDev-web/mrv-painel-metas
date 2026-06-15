import { KPI, getStatus, getStatusLabel } from '../types'
import Icon from './Icon'
import './KPICard.css'

interface Props {
  kpi: KPI
  onValueChange: (id: string, valor: number) => void
}

const STATUS_ICON = { below: 'warning', range: 'check_circle', above: 'stars' } as const

export default function KPICard({ kpi, onValueChange }: Props) {
  const status = getStatus(kpi.valor, kpi.gatilho)
  const progressWidth = Math.min(kpi.valor, 100)

  return (
    <div className={`kpi-card status-${status}`}>
      <div className="kpi-top">
        <div className="kpi-head">
          <h4 className="kpi-name">{kpi.name}</h4>
          <div className="kpi-badges">
            {kpi.peso !== null && (
              <span className="badge-peso">Peso: {kpi.peso}%</span>
            )}
            <span className="badge-gatilho">Gatilho: {kpi.gatilho}%</span>
          </div>
        </div>
        <span className={`status-tag status-${status}`}>
          <Icon name={STATUS_ICON[status]} size={14} filled={status === 'above'} />
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="kpi-body">
        <div className="kpi-value-row">
          <span className="kpi-value-label">Atingimento simulado</span>
          <span className="kpi-value">{kpi.valor}%</span>
        </div>
        <input
          type="range"
          className={`kpi-slider status-${status}`}
          min={0}
          max={120}
          step={1}
          value={kpi.valor}
          onChange={(e) => onValueChange(kpi.id, parseInt(e.target.value))}
          aria-label={`Atingimento de ${kpi.name}`}
        />
        <div className="kpi-track">
          <div className="kpi-track-fill" style={{ width: `${progressWidth}%` }} />
        </div>
      </div>
    </div>
  )
}
