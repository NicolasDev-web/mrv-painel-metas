import { KPI, getStatus } from '../types'
import './BonusGauge.css'

interface Props {
  kpis: KPI[]
}

/** Contribuição de bônus de um KPI: below → 0 | range → peso*(valor/100) | above → peso. */
function contribution(kpi: KPI): number {
  if (kpi.peso === null) return 0
  const status = getStatus(kpi.valor, kpi.gatilho)
  switch (status) {
    case 'below': return 0
    case 'range': return kpi.peso * (kpi.valor / 100)
    case 'above': return kpi.peso
  }
}

/** Faixa de cor do gauge conforme o percentual atingido. */
function bandClass(pct: number): string {
  if (pct < 50) return 'band-red'
  if (pct < 80) return 'band-orange'
  return 'band-green'
}

const R = 80
const CX = 100
const CY = 100
const ARC_LENGTH = Math.PI * R // comprimento do semicírculo

export default function BonusGauge({ kpis }: Props) {
  const bonusTotal = kpis.reduce((s, k) => s + contribution(k), 0)
  const bonusMax = kpis.reduce((s, k) => s + (k.peso ?? 0), 0)
  const percentualBonus = bonusMax > 0 ? (bonusTotal / bonusMax) * 100 : 0

  const band = bandClass(percentualBonus)
  // Fração visível do arco (0..1) controla o stroke-dashoffset.
  const offset = ARC_LENGTH * (1 - Math.min(percentualBonus, 100) / 100)

  // Caminho do semicírculo: da esquerda (20,100) até a direita (180,100), arco por cima.
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

  return (
    <div className={`bonus-gauge ${band}`}>
      <h3 className="bonus-title">Bônus potencial estimado</h3>

      <div className="gauge-svg-wrap">
        <svg viewBox="0 0 200 120" className="gauge-svg" role="img"
             aria-label={`Bônus potencial: ${percentualBonus.toFixed(1)}%`}>
          <path
            className="gauge-track"
            d={arcPath}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path
            className="gauge-progress"
            d={arcPath}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-value">{percentualBonus.toFixed(1)}%</span>
          <span className="gauge-label">do bônus máximo</span>
        </div>
      </div>

      <ul className="gauge-list">
        {kpis.map(kpi => {
          const isNull = kpi.peso === null
          const contrib = contribution(kpi)
          const paid = !isNull && getStatus(kpi.valor, kpi.gatilho) !== 'below'
          const itemClass = isNull ? 'item-null' : paid ? 'item-paid' : 'item-cut'
          return (
            <li key={kpi.id} className={`gauge-item ${itemClass}`}>
              <span className="gi-name">{kpi.name}</span>
              <span className="gi-peso">{isNull ? '—' : `peso ${kpi.peso}%`}</span>
              <span className="gi-contrib">
                {isNull ? '—' : `${contrib.toFixed(1)}%`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
