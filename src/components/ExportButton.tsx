import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import PptxGenJS from 'pptxgenjs'
import { KPI, getStatus, getStatusLabel, KPIStatus } from '../types'
import './ExportButton.css'

interface Props {
  kpis: KPI[]
  scenarioName?: string
}

/** Paleta MRV — única fonte de cores deste módulo (sem hex soltos no código). */
const MRV_COLORS = {
  green: '#0B5A42',
  greenSoft: '#E8F5E9',
  orange: '#F39200',
  red: '#D32F2F',
  white: '#FFFFFF',
  bg: '#F5F5F5',
  gray: '#333333',
  rowAlt: '#F5F5F5',
} as const

/** Cor de texto por status, reaproveitada no PDF e no PPTX. */
function statusHex(status: KPIStatus): string {
  switch (status) {
    case 'below': return MRV_COLORS.red
    case 'range': return MRV_COLORS.green
    case 'above': return MRV_COLORS.orange
  }
}

/**
 * Contribuição de bônus de um KPI (mesmo algoritmo do BonusGauge):
 *  below → 0 | range → peso*(valor/100) | above → peso
 */
function kpiBonus(kpi: KPI): number {
  const peso = kpi.peso ?? 0
  const status = getStatus(kpi.valor, kpi.gatilho)
  switch (status) {
    case 'below': return 0
    case 'range': return peso * (kpi.valor / 100)
    case 'above': return peso
  }
}

interface ScenarioSummary {
  totalPeso: number
  pagos: number
  cortados: number
  bonusPct: number
}

function summarize(kpis: KPI[]): ScenarioSummary {
  const totalPeso = kpis.reduce((s, k) => s + (k.peso ?? 0), 0)
  const pagos = kpis.filter(k => getStatus(k.valor, k.gatilho) !== 'below').length
  const cortados = kpis.length - pagos
  const bonusPct = kpis.reduce((s, k) => s + kpiBonus(k), 0)
  return { totalPeso, pagos, cortados, bonusPct }
}

function today(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR')
}

const fmtPeso = (peso: number | null) => (peso === null ? '—' : `${peso}%`)

export default function ExportButton({ kpis, scenarioName = 'Cenário atual' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function exportPDF() {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = 297
      const pageH = 210
      const margin = 12

      // ---- Header verde ----
      const headerH = 20
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(0, 0, pageW, headerH, 'F')
      doc.setTextColor(MRV_COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Painel de Metas Comerciais — MRV&CO', margin, 9)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(
        `Comercial Diretoria | Ciclo 2026 | Gerado em ${todayBR()}`,
        margin,
        15,
      )

      // ---- Seção 1: tabela Visão Geral ----
      let y = headerH + 10
      doc.setTextColor(MRV_COLORS.green)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('1. Visão Geral das Metas', margin, y)
      y += 5

      const cols = [
        { label: 'KPI', w: 90 },
        { label: 'Bloco', w: 32 },
        { label: 'Peso', w: 22 },
        { label: 'Gatilho', w: 25 },
        { label: 'Realização', w: 30 },
        { label: 'Status', w: 74 },
      ]
      const tableX = margin
      const rowH = 8

      const colX = (idx: number) =>
        tableX + cols.slice(0, idx).reduce((s, c) => s + c.w, 0)

      // Cabeçalho da tabela
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(tableX, y, pageW - margin * 2, rowH, 'F')
      doc.setTextColor(MRV_COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      cols.forEach((c, i) => doc.text(c.label, colX(i) + 2, y + 5.5))
      y += rowH

      // Linhas
      doc.setFont('helvetica', 'normal')
      kpis.forEach((kpi, idx) => {
        const status = getStatus(kpi.valor, kpi.gatilho)
        if (idx % 2 === 1) {
          doc.setFillColor(MRV_COLORS.rowAlt)
        } else {
          doc.setFillColor(MRV_COLORS.white)
        }
        doc.rect(tableX, y, pageW - margin * 2, rowH, 'F')

        doc.setTextColor(MRV_COLORS.gray)
        doc.setFontSize(8.5)
        doc.text(kpi.name, colX(0) + 2, y + 5.5, { maxWidth: cols[0].w - 4 })
        doc.text(kpi.bloco, colX(1) + 2, y + 5.5)
        doc.text(fmtPeso(kpi.peso), colX(2) + 2, y + 5.5)
        doc.text(`${kpi.gatilho}%`, colX(3) + 2, y + 5.5)
        doc.text(`${kpi.valor}%`, colX(4) + 2, y + 5.5)
        doc.setTextColor(statusHex(status))
        doc.setFont('helvetica', 'bold')
        doc.text(getStatusLabel(status), colX(5) + 2, y + 5.5)
        doc.setFont('helvetica', 'normal')
        y += rowH
      })

      // Linha de total
      const { totalPeso, pagos, cortados, bonusPct } = summarize(kpis)
      doc.setFillColor(MRV_COLORS.greenSoft)
      doc.rect(tableX, y, pageW - margin * 2, rowH, 'F')
      doc.setTextColor(MRV_COLORS.green)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Total', colX(0) + 2, y + 5.5)
      doc.text(`${totalPeso.toFixed(1)}%`, colX(2) + 2, y + 5.5)
      y += rowH + 12

      // ---- Seção 2: Resumo do Bônus Potencial ----
      doc.setTextColor(MRV_COLORS.green)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('2. Resumo do Bônus Potencial', margin, y)
      y += 4

      const boxW = pageW - margin * 2
      const boxH = 26
      doc.setFillColor(MRV_COLORS.greenSoft)
      doc.setDrawColor(MRV_COLORS.green)
      doc.setLineWidth(0.4)
      doc.rect(margin, y, boxW, boxH, 'FD')

      doc.setTextColor(MRV_COLORS.gray)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text(`KPIs atingidos: ${pagos}`, margin + 6, y + 10)
      doc.text(`KPIs não atingidos: ${cortados}`, margin + 6, y + 18)
      doc.setTextColor(MRV_COLORS.green)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(
        `Bônus potencial estimado: ${bonusPct.toFixed(1)}%`,
        margin + boxW / 2,
        y + 15,
      )

      // ---- Rodapé ----
      // getNumberOfPages não está na tipagem; o método interno expõe a contagem.
      const pageCount = doc.internal.pages.length - 1
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setTextColor(MRV_COLORS.gray)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(
          'Documento gerado automaticamente — uso interno MRV',
          margin,
          pageH - 6,
        )
        doc.text(`Página ${p} de ${pageCount}`, pageW - margin, pageH - 6, {
          align: 'right',
        })
      }

      doc.save(`MRV_Metas_${today()}.pdf`)
      setOpen(false)
    } catch (err) {
      console.error('Falha ao exportar PDF:', err)
      alert('Não foi possível gerar o PDF. Tente novamente.')
    }
  }

  async function exportPPTX() {
    try {
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 in
      const slideW = 13.33
      const { pagos, cortados, bonusPct } = summarize(kpis)

      // ---- Slide 1: Capa ----
      const cover = pptx.addSlide()
      cover.background = { color: MRV_COLORS.green }
      cover.addText('Painel de Metas Comerciais', {
        x: 0.8, y: 2.4, w: slideW - 1.6, h: 1.2,
        fontSize: 36, bold: true, color: MRV_COLORS.white, align: 'left',
      })
      cover.addText('Comercial Diretoria — Ciclo 2026', {
        x: 0.8, y: 3.6, w: slideW - 1.6, h: 0.6,
        fontSize: 18, color: MRV_COLORS.orange, align: 'left',
      })
      cover.addText(`Gerado em ${todayBR()}`, {
        x: 0.8, y: 6.6, w: slideW - 1.6, h: 0.4,
        fontSize: 11, color: MRV_COLORS.white, transparency: 30, align: 'left',
      })

      // ---- Slide 2: Tabela ----
      const tbl = pptx.addSlide()
      tbl.background = { color: MRV_COLORS.white }
      tbl.addText('Visão Geral das Metas', {
        x: 0.5, y: 0.3, w: slideW - 1, h: 0.6,
        fontSize: 20, bold: true, color: MRV_COLORS.green,
      })

      const headerCells: PptxGenJS.TableCell[] = [
        'KPI', 'Bloco', 'Peso', 'Gatilho', 'Realização', 'Status',
      ].map(t => ({
        text: t,
        options: { bold: true, color: MRV_COLORS.white, fill: { color: MRV_COLORS.green }, align: 'center', valign: 'middle' },
      }))

      const bodyRows: PptxGenJS.TableRow[] = kpis.map((kpi, idx) => {
        const status = getStatus(kpi.valor, kpi.gatilho)
        const fill = { color: idx % 2 === 1 ? MRV_COLORS.bg : MRV_COLORS.white }
        const base: PptxGenJS.TableCellProps = { color: MRV_COLORS.gray, fill, valign: 'middle', fontSize: 11 }
        return [
          { text: kpi.name, options: { ...base, align: 'left' } },
          { text: kpi.bloco, options: { ...base, align: 'center' } },
          { text: fmtPeso(kpi.peso), options: { ...base, align: 'center' } },
          { text: `${kpi.gatilho}%`, options: { ...base, align: 'center' } },
          { text: `${kpi.valor}%`, options: { ...base, align: 'center' } },
          { text: getStatusLabel(status), options: { ...base, align: 'center', bold: true, color: statusHex(status) } },
        ]
      })

      tbl.addTable([headerCells, ...bodyRows], {
        x: 0.5, y: 1.1, w: slideW - 1,
        colW: [4.6, 1.6, 1.4, 1.6, 1.8, 2.33],
        border: { type: 'solid', color: MRV_COLORS.bg, pt: 1 },
        autoPage: false,
      })

      tbl.addText('MRV&CO', {
        x: slideW - 2.5, y: 6.9, w: 2, h: 0.4,
        fontSize: 14, bold: true, color: MRV_COLORS.orange, align: 'right',
      })

      // ---- Slide 3: Resumo Executivo ----
      const sum = pptx.addSlide()
      sum.background = { color: MRV_COLORS.bg }
      sum.addText('Resumo do Bônus Potencial', {
        x: 0.5, y: 0.4, w: slideW - 1, h: 0.6,
        fontSize: 22, bold: true, color: MRV_COLORS.green,
      })

      const cards: { label: string; value: string; color: string }[] = [
        { label: 'KPIs Atingidos', value: String(pagos), color: MRV_COLORS.green },
        { label: 'KPIs Não Atingidos', value: String(cortados), color: MRV_COLORS.red },
        { label: 'Bônus Estimado', value: `${bonusPct.toFixed(1)}%`, color: MRV_COLORS.orange },
      ]
      const cardW = 3.6
      const gap = 0.6
      const totalW = cards.length * cardW + (cards.length - 1) * gap
      const startX = (slideW - totalW) / 2
      cards.forEach((card, i) => {
        const x = startX + i * (cardW + gap)
        sum.addShape(pptx.ShapeType.roundRect, {
          x, y: 2.2, w: cardW, h: 2.6,
          fill: { color: card.color }, rectRadius: 0.1,
        })
        sum.addText(card.label, {
          x, y: 2.5, w: cardW, h: 0.6,
          fontSize: 16, color: MRV_COLORS.white, align: 'center',
        })
        sum.addText(card.value, {
          x, y: 3.2, w: cardW, h: 1.2,
          fontSize: 40, bold: true, color: MRV_COLORS.white, align: 'center',
        })
      })

      sum.addText('Documento gerado automaticamente — uso interno MRV', {
        x: 0.5, y: 6.9, w: slideW - 1, h: 0.4,
        fontSize: 10, color: MRV_COLORS.gray, align: 'center',
      })

      await pptx.writeFile({ fileName: `MRV_Metas_${today()}.pptx` })
      setOpen(false)
    } catch (err) {
      console.error('Falha ao exportar PPTX:', err)
      alert('Não foi possível gerar o PowerPoint. Tente novamente.')
    }
  }

  return (
    <div className="export-wrap" ref={wrapRef}>
      <button
        type="button"
        className="export-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        title={`Exportar ${scenarioName}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Exportar
      </button>
      {open && (
        <div className="export-menu" role="menu">
          <button type="button" role="menuitem" className="export-item" onClick={exportPDF}>
            Exportar PDF
          </button>
          <button type="button" role="menuitem" className="export-item" onClick={exportPPTX}>
            Exportar PowerPoint
          </button>
        </div>
      )}
    </div>
  )
}
