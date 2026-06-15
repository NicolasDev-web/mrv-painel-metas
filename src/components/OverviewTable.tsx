import { KPI } from '../types'
import './OverviewTable.css'

interface Props {
  kpis: KPI[]
}

export default function OverviewTable({ kpis }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Detalhamento dos KPIs</h2>
        <span className="panel-chip">Ciclo 2026</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Indicador KPI</th>
              <th>Peso</th>
              <th className="ta-right">Gatilho (LI)</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map(k => {
              const low = k.gatilho <= 80
              return (
                <tr key={k.id}>
                  <td className="tbl-name">{k.name}</td>
                  <td className="tbl-peso">
                    {k.peso !== null ? (
                      <div className="peso-cell">
                        <span className="peso-txt">{k.peso}%</span>
                        <div className="peso-bar">
                          <div className="peso-fill" style={{ width: `${k.peso}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="peso-na">—</span>
                    )}
                  </td>
                  <td className="ta-right">
                    <span className={`gat-badge ${low ? 'gat-low' : ''}`}>
                      {k.gatilho.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
