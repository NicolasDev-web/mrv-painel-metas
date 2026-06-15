import { useEffect, useRef } from 'react'
import { KPI } from '../types'
import './DonutChart.css'

interface Props {
  kpis: KPI[]
  theme?: string
}

const COLORS = ['#0B5A42', '#1A7A5A', '#A8D5C2', '#F39200', '#F5B041', '#E67E22', '#D5D5D5']

export default function DonutChart({ kpis, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const items = kpis.filter(k => k.peso !== null)
  const total = items.reduce((s, k) => s + (k.peso ?? 0), 0)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    const cs = getComputedStyle(c)
    const surface = cs.getPropertyValue('--surface').trim() || '#fff'
    const centerText = cs.getPropertyValue('--mrv-green').trim() || '#0B5A42'
    const subText = cs.getPropertyValue('--mrv-gray-light').trim() || '#888'

    const dpr = window.devicePixelRatio || 1
    c.width = 180 * dpr
    c.height = 180 * dpr
    ctx.scale(dpr, dpr)

    const cx = 90, cy = 90, r = 70, r2 = 45
    let start = -Math.PI / 2

    items.forEach((k, i) => {
      const angle = ((k.peso ?? 0) / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, start + angle)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      start += angle
    })

    ctx.beginPath()
    ctx.arc(cx, cy, r2, 0, 2 * Math.PI)
    ctx.fillStyle = surface
    ctx.fill()

    ctx.fillStyle = centerText
    ctx.font = '500 20px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(total + '%', cx, cy - 6)
    ctx.fillStyle = subText
    ctx.font = '11px system-ui'
    ctx.fillText('alocado', cx, cy + 10)
  }, [items, total, theme])

  return (
    <div className="donut-wrap">
      <h3 className="donut-title">Distribuição dos pesos</h3>
      <canvas ref={canvasRef} width={180} height={180} style={{ width: 180, height: 180 }} />
      <div className="donut-legend">
        {items.map((k, i) => (
          <div key={k.id} className="donut-legend-item">
            <span className="donut-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span>{k.peso}% {k.name.length > 24 ? k.name.slice(0, 24) + '…' : k.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
