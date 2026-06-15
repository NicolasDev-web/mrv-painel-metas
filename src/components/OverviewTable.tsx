import { KPI } from '../types'
import './OverviewTable.css'

interface Props {
  kpis: KPI[]
}

export default function OverviewTable({ kpis }: Props) {
  const totalPeso = kpis.reduce((s, k) => s + (k.peso ?? 0), 0)

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Peso</th>
            <th>Gatilho</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map(k => (
            <tr key={k.id}>
              <td className="tbl-name">{k.name}</td>
              <td>
                {k.peso !== null ? (
                  <div className="peso-bar">
                    <div className="peso-fill" style={{ width: k.peso * 3.2 }} />
                    <span className="peso-txt">{k.peso}%</span>
                  </div>
                ) : (
                  <span className="peso-na">—</span>
                )}
              </td>
              <td>
                <span className="gat-badge">{k.gatilho}%</span>
              </td>
            </tr>
          ))}
          <tr className="tot-row">
            <td>Total</td>
            <td><span className="peso-txt">{totalPeso}%</span></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
