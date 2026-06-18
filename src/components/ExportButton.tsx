import { useEffect, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import PptxGenJS from 'pptxgenjs'
import { KPI, getStatus, getStatusLabel, KPIStatus } from '../types'
import './ExportButton.css'

interface Props {
  kpis: KPI[]
  scenarioName?: string
}

/**
 * Paleta MRV — única fonte de cores deste módulo.
 * PDF usa strings com '#'. pptxgenjs exige hex SEM '#'.
 */
const MRV_COLORS = {
  // com '#' → para jsPDF
  green:     '#00412E',
  greenDark: '#1A3A2D',
  greenSoft: '#E8F5E9',
  orange:    '#FC9910',
  red:       '#D32F2F',
  white:     '#FFFFFF',
  bg:        '#F5F5F5',
  gray:      '#333333',
  // sem '#' → para pptxgenjs
  pGreen:     '00412E',
  pGreenDark: '1A3A2D',
  pOrange:    'FC9910',
  pRed:       'D32F2F',
  pWhite:     'FFFFFF',
  pGray:      '333333',
} as const

/** Cor de texto por status (com '#') — para jsPDF. */
function statusHex(status: KPIStatus): string {
  switch (status) {
    case 'below': return MRV_COLORS.red
    case 'range': return MRV_COLORS.green
    case 'above': return MRV_COLORS.orange
  }
}

/** Cor de texto por status (sem '#') — para pptxgenjs. */
function statusPptx(status: KPIStatus): string {
  switch (status) {
    case 'below': return MRV_COLORS.pRed
    case 'range': return MRV_COLORS.pGreen
    case 'above': return MRV_COLORS.pOrange
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
      const mg = 18

      // ── rodapé ───────────────────────────────────────────────────────────
      function addFooter(pageNum: number, pageTotal: number) {
        doc.setPage(pageNum)
        doc.setDrawColor('#DDDDDD')
        doc.setLineWidth(0.3)
        doc.line(mg, pageH - 12, pageW - mg, pageH - 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor('#999999')
        doc.text('MRV&CO — Documento de uso interno', mg, pageH - 6)
        doc.text(
          `Ciclo 2026  ·  ${todayBR()}  ·  Página ${pageNum} de ${pageTotal}`,
          pageW - mg, pageH - 6, { align: 'right' },
        )
      }

      const { pagos, cortados, bonusPct, totalPeso } = summarize(kpis)

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 1 — CAPA
      // ════════════════════════════════════════════════════════════════════════

      doc.setFillColor(MRV_COLORS.green)
      doc.rect(0, 0, pageW, pageH, 'F')

      doc.setFillColor(MRV_COLORS.orange)
      doc.rect(0, 0, 6, pageH, 'F')

      const cardX = 40
      const cardY = 35
      const cardW = pageW - 80
      const cardH = 115
      doc.setFillColor(MRV_COLORS.white)
      doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')

      // Linha verde no topo do cartão
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(cardX, cardY, cardW, 3, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('RELATÓRIO DE METAS  ·  CICLO 2026', cardX + 18, cardY + 18, { charSpace: 1.5 })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(28)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Painel de Metas', cardX + 18, cardY + 36)
      doc.text('Comerciais', cardX + 18, cardY + 50)

      doc.setDrawColor('#E0E0E0')
      doc.setLineWidth(0.4)
      doc.line(cardX + 18, cardY + 58, cardX + cardW - 18, cardY + 58)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor('#555555')
      doc.text('Comercial Diretoria', cardX + 18, cardY + 70)

      doc.setFontSize(9.5)
      doc.setTextColor('#888888')
      doc.text(`Gerado em ${todayBR()}`, cardX + 18, cardY + 82)

      // Badge bônus
      const badgeX = cardX + cardW - 78
      const badgeY = cardY + 55
      doc.setFillColor(MRV_COLORS.greenSoft)
      doc.roundedRect(badgeX, badgeY, 60, 40, 3, 3, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor('#555555')
      doc.text('Bônus potencial', badgeX + 30, badgeY + 12, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(MRV_COLORS.green)
      doc.text(`${bonusPct.toFixed(1)}%`, badgeX + 30, badgeY + 28, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('MRV&CO', cardX + 18, cardY + cardH - 8)

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 2 — TABELA DETALHADA (com Meta e Realizado)
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage()

      doc.setFillColor(MRV_COLORS.green)
      doc.rect(0, 0, pageW, 22, 'F')
      doc.setFillColor(MRV_COLORS.orange)
      doc.rect(0, 0, 6, 22, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(MRV_COLORS.white)
      doc.text('Visão Geral das Metas', mg + 2, 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('KPIs · Pesos · Meta · Realizado · Status', pageW - mg, 14, { align: 'right' })

      // Colunas: total tableW = 297 - 18*2 = 261 mm
      // KPI(62) + Grupo(26) + Peso(22) + Gatilho(22) + Meta(36) + Realizado(36) + Realiz%(28) + Status(29) = 261
      const cols = [
        { label: 'KPI',        w: 62 },
        { label: 'Grupo',      w: 26 },
        { label: 'Peso',       w: 22 },
        { label: 'Gatilho',    w: 22 },
        { label: 'Meta',       w: 36 },
        { label: 'Realizado',  w: 36 },
        { label: 'Realiz. %',  w: 28 },
        { label: 'Status',     w: 29 },
      ]
      const tableX = mg
      const tableW = pageW - mg * 2
      const rowH = 9
      let y = 34

      const colX = (idx: number) =>
        tableX + cols.slice(0, idx).reduce((s, c) => s + c.w, 0)

      // Cabeçalho da tabela
      doc.setFillColor(MRV_COLORS.greenDark)
      doc.rect(tableX, y, tableW, rowH + 1, 'F')
      doc.setTextColor(MRV_COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      cols.forEach((c, i) => doc.text(c.label, colX(i) + 2, y + 6.5))
      y += rowH + 1

      // Linhas de dados
      doc.setFont('helvetica', 'normal')
      kpis.forEach((kpi, idx) => {
        const status = getStatus(kpi.valor, kpi.gatilho)
        const isAlt = idx % 2 === 1
        doc.setFillColor(isAlt ? '#F7F7F7' : MRV_COLORS.white)
        doc.rect(tableX, y, tableW, rowH, 'F')

        // Borda lateral colorida por status
        doc.setFillColor(statusHex(status))
        doc.rect(tableX, y, 2.5, rowH, 'F')

        // KPI name
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(MRV_COLORS.gray)
        doc.setFontSize(7.5)
        doc.text(kpi.name, colX(0) + 4, y + 6, { maxWidth: cols[0].w - 6 })

        // Grupo
        const grupo = ['ro', 'mb', 'nps'].includes(kpi.id) ? 'Cluster' : 'Comercial'
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor('#888888')
        doc.text(grupo, colX(1) + 2, y + 6)

        // Peso
        doc.setFontSize(7.5)
        doc.setTextColor(MRV_COLORS.gray)
        doc.text(fmtPeso(kpi.peso), colX(2) + 2, y + 6)

        // Gatilho
        doc.text(`${kpi.gatilho}%`, colX(3) + 2, y + 6)

        // Meta (metaLabel)
        doc.setTextColor('#444444')
        doc.text(kpi.metaLabel ?? '—', colX(4) + 2, y + 6, { maxWidth: cols[4].w - 3 })

        // Realizado (realizadoLabel)
        doc.text(kpi.realizadoLabel ?? '—', colX(5) + 2, y + 6, { maxWidth: cols[5].w - 3 })

        // Realização % simulada: negrito e colorida pelo status
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(statusHex(status))
        doc.text(`${kpi.valor}%`, colX(6) + 2, y + 6)

        // Badge de status (col 7)
        const statusBg: Record<KPIStatus, string> = {
          below: '#FDECEA',
          range: '#E8F5E9',
          above: '#FFF3E0',
        }
        doc.setFillColor(statusBg[status])
        doc.roundedRect(colX(7) + 1, y + 1.5, cols[7].w - 2, rowH - 3, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(statusHex(status))
        doc.text(
          getStatusLabel(status),
          colX(7) + cols[7].w / 2,
          y + 6.2,
          { align: 'center', maxWidth: cols[7].w - 3 },
        )

        doc.setFont('helvetica', 'normal')
        y += rowH
      })

      // Linha de total
      doc.setFillColor(MRV_COLORS.greenSoft)
      doc.rect(tableX, y, tableW, rowH + 1, 'F')
      doc.setDrawColor(MRV_COLORS.green)
      doc.setLineWidth(0.5)
      doc.line(tableX, y, tableX + tableW, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Total ponderado', colX(0) + 4, y + 7)
      doc.text(`${totalPeso.toFixed(1)}%`, colX(2) + 2, y + 7)

      addFooter(2, 3)

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 3 — RESUMO EXECUTIVO
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage()

      doc.setFillColor(MRV_COLORS.green)
      doc.rect(0, 0, pageW, 22, 'F')
      doc.setFillColor(MRV_COLORS.orange)
      doc.rect(0, 0, 6, 22, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(MRV_COLORS.white)
      doc.text('Resumo Executivo', mg + 2, 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('Bônus potencial estimado', pageW - mg, 14, { align: 'right' })

      // Três cartões de métricas lado a lado
      const cards = [
        { label: 'KPIs Atingidos',     value: String(pagos),              color: MRV_COLORS.green,  bg: MRV_COLORS.greenSoft },
        { label: 'KPIs Não Atingidos', value: String(cortados),           color: MRV_COLORS.red,    bg: '#FDECEA' },
        { label: 'Bônus Potencial',    value: `${bonusPct.toFixed(1)}%`,  color: MRV_COLORS.orange, bg: '#FFF3E0' },
      ] as const

      const cW = (pageW - mg * 2 - 16) / 3
      const cH = 50
      const cY = 36
      cards.forEach((card, i) => {
        const cX = mg + i * (cW + 8)
        doc.setFillColor(card.bg)
        doc.roundedRect(cX, cY, cW, cH, 3, 3, 'F')
        doc.setDrawColor(card.color)
        doc.setLineWidth(0.5)
        doc.line(cX, cY, cX + cW, cY)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor('#666666')
        doc.text(card.label, cX + cW / 2, cY + 10, { align: 'center' })
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(26)
        doc.setTextColor(card.color)
        doc.text(card.value, cX + cW / 2, cY + 32, { align: 'center' })
      })

      // Indicadores por status
      const statusGroups: { status: KPIStatus; label: string }[] = [
        { status: 'above', label: 'Acima da meta' },
        { status: 'range', label: 'Dentro da meta' },
        { status: 'below', label: 'Abaixo de meta' },
      ]
      let gy = cY + cH + 14
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Distribuição por status', mg, gy)
      gy += 8

      statusGroups.forEach(({ status, label }) => {
        const items = kpis.filter(k => getStatus(k.valor, k.gatilho) === status)
        if (items.length === 0) return
        doc.setFillColor(statusHex(status))
        doc.rect(mg, gy, 3, 5.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(statusHex(status))
        doc.text(label, mg + 5, gy + 4.5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(MRV_COLORS.gray)
        const names = items.map(k => k.name).join('   ·   ')
        doc.text(names, mg + 5, gy + 11, { maxWidth: pageW - mg * 2 - 5 })
        gy += 18
      })

      // Pull quote bônus estimado
      const pqY = pageH - 52
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(mg, pqY, pageW - mg * 2, 30, 'F')
      doc.setFillColor(MRV_COLORS.orange)
      doc.rect(mg, pqY, 4, 30, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor('#CCCCCC')
      doc.text('Bônus potencial estimado para o cenário simulado:', mg + 10, pqY + 11)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(MRV_COLORS.white)
      doc.text(`${bonusPct.toFixed(1)}% do total`, mg + 10, pqY + 24)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text(
        `${pagos} de ${kpis.length} KPIs atingidos`,
        pageW - mg - 4, pqY + 17, { align: 'right' },
      )

      // Rodapés das 3 páginas
      addFooter(1, 3)
      addFooter(2, 3) // re-aplica para garantir página 2
      addFooter(3, 3)

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
      pptx.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 in
      const W = 13.33
      const H = 7.5
      const MG = 0.55
      const { pagos, cortados, bonusPct } = summarize(kpis)

      // Rodapé padrão para slides internos
      function addSlideFooter(slide: PptxGenJS.Slide) {
        slide.addShape(pptx.ShapeType.line, {
          x: MG, y: H - 0.42, w: W - MG * 2, h: 0,
          line: { color: 'DDDDDD', width: 0.5 },
        })
        slide.addText('MRV&CO  ·  Comercial Diretoria  ·  Ciclo 2026', {
          x: MG, y: H - 0.38, w: W * 0.6, h: 0.3,
          fontSize: 7.5, color: 'AAAAAA', align: 'left',
        })
        slide.addText(todayBR(), {
          x: W - MG - 1.5, y: H - 0.38, w: 1.5, h: 0.3,
          fontSize: 7.5, color: 'AAAAAA', align: 'right',
        })
      }

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 1 — CAPA
      // ════════════════════════════════════════════════════════════════════
      const cover = pptx.addSlide()

      // Metade esquerda: fundo verde
      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W * 0.55, h: H,
        fill: { color: MRV_COLORS.pGreen },
        line: { color: MRV_COLORS.pGreen, width: 0 },
      })
      // Metade direita: fundo cinza claro
      cover.addShape(pptx.ShapeType.rect, {
        x: W * 0.55, y: 0, w: W * 0.45, h: H,
        fill: { color: 'F2F2F2' },
        line: { color: 'F2F2F2', width: 0 },
      })
      // Barra laranja no topo esquerdo
      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W * 0.55, h: 0.12,
        fill: { color: MRV_COLORS.pOrange },
        line: { color: MRV_COLORS.pOrange, width: 0 },
      })

      cover.addText('RELATÓRIO DE METAS  ·  CICLO 2026', {
        x: MG, y: 1.8, w: W * 0.5, h: 0.3,
        fontSize: 8, bold: true, color: MRV_COLORS.pOrange,
        charSpacing: 2, align: 'left',
      })
      cover.addText('Painel de Metas\nComerciais', {
        x: MG, y: 2.2, w: W * 0.5, h: 1.9,
        fontSize: 38, bold: true, color: MRV_COLORS.pWhite, align: 'left',
        breakLine: true,
      })
      cover.addText('Comercial Diretoria', {
        x: MG, y: 4.35, w: W * 0.5, h: 0.45,
        fontSize: 14, color: MRV_COLORS.pWhite, transparency: 25, align: 'left',
      })
      cover.addText(`Gerado em ${todayBR()}`, {
        x: MG, y: 6.8, w: W * 0.5, h: 0.35,
        fontSize: 9, color: MRV_COLORS.pWhite, transparency: 45, align: 'left',
      })

      // Painel de bônus na coluna direita
      const panelX = W * 0.55 + 0.6
      const panelW = W * 0.45 - 1.2
      cover.addText('Bônus potencial estimado', {
        x: panelX, y: 1.8, w: panelW, h: 0.4,
        fontSize: 10, color: '888888', align: 'center',
      })
      cover.addText(`${bonusPct.toFixed(1)}%`, {
        x: panelX, y: 2.3, w: panelW, h: 1.4,
        fontSize: 72, bold: true, color: MRV_COLORS.pGreen, align: 'center',
      })
      cover.addShape(pptx.ShapeType.line, {
        x: panelX + panelW * 0.1, y: 3.85, w: panelW * 0.8, h: 0,
        line: { color: 'DDDDDD', width: 0.6 },
      })
      cover.addText(`${pagos} KPIs atingidos  ·  ${cortados} não atingidos`, {
        x: panelX, y: 4.05, w: panelW, h: 0.4,
        fontSize: 10, color: '666666', align: 'center',
      })
      cover.addText('MRV&CO', {
        x: panelX, y: 6.7, w: panelW, h: 0.45,
        fontSize: 18, bold: true, color: MRV_COLORS.pOrange, align: 'center',
      })

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 2 — DISTRIBUIÇÃO DE PESOS (barras horizontais + meta/realizado)
      // ════════════════════════════════════════════════════════════════════
      const dist = pptx.addSlide()
      dist.background = { color: MRV_COLORS.pWhite }

      dist.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.75,
        fill: { color: MRV_COLORS.pGreen },
        line: { color: MRV_COLORS.pGreen, width: 0 },
      })
      dist.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.18, h: 0.75,
        fill: { color: MRV_COLORS.pOrange },
        line: { color: MRV_COLORS.pOrange, width: 0 },
      })
      dist.addText('Distribuição de Pesos por KPI', {
        x: 0.35, y: 0, w: W * 0.65, h: 0.75,
        fontSize: 16, bold: true, color: MRV_COLORS.pWhite, valign: 'middle',
      })
      dist.addText('Impacto de cada indicador no bônus total', {
        x: W * 0.65, y: 0, w: W * 0.35 - MG, h: 0.75,
        fontSize: 9, color: MRV_COLORS.pOrange, valign: 'middle', align: 'right',
      })

      const barStartY = 1.0
      const barH     = 0.52
      const barGap   = 0.1
      // Layout: [label KPI (2.6in)] [barra (4.8in)] [peso(0.6)] [status(1.4)] [meta/realiz (3.3in)]
      const labelW   = 2.6
      const maxBarW  = 4.8
      const pesoW    = 0.65
      const statusW  = 1.5
      const infoX    = MG + labelW + maxBarW + pesoW + statusW + 0.2
      const infoW    = W - infoX - MG

      kpis.forEach((kpi, i) => {
        const status  = getStatus(kpi.valor, kpi.gatilho)
        const peso    = kpi.peso ?? 0
        const bY      = barStartY + i * (barH + barGap)
        const barFill = peso > 0 ? statusPptx(status) : 'CCCCCC'
        const barW    = peso > 0 ? (peso / 25) * maxBarW : 0.15

        // Label KPI
        dist.addText(kpi.name, {
          x: MG, y: bY, w: labelW, h: barH,
          fontSize: 9, color: MRV_COLORS.pGray, valign: 'middle', align: 'left',
        })
        // Track cinza
        dist.addShape(pptx.ShapeType.rect, {
          x: MG + labelW, y: bY + barH * 0.3, w: maxBarW, h: barH * 0.4,
          fill: { color: 'EEEEEE' }, line: { color: 'EEEEEE', width: 0 },
        })
        // Barra preenchida
        if (barW > 0) {
          dist.addShape(pptx.ShapeType.rect, {
            x: MG + labelW, y: bY + barH * 0.3, w: barW, h: barH * 0.4,
            fill: { color: barFill }, line: { color: barFill, width: 0 },
          })
        }
        // Peso %
        dist.addText(fmtPeso(kpi.peso), {
          x: MG + labelW + maxBarW + 0.08, y: bY, w: pesoW, h: barH,
          fontSize: 9, bold: true, color: barFill, valign: 'middle', align: 'left',
        })
        // Status tag
        dist.addText(getStatusLabel(status), {
          x: MG + labelW + maxBarW + pesoW + 0.08, y: bY + 0.05, w: statusW, h: barH - 0.1,
          fontSize: 7.5, bold: true, color: statusPptx(status),
          valign: 'middle', align: 'center',
        })
        // Coluna Meta / Realizado
        dist.addText(`Meta: ${kpi.metaLabel ?? '—'}`, {
          x: infoX, y: bY, w: infoW, h: barH * 0.5,
          fontSize: 7.5, color: '555555', valign: 'bottom', align: 'left',
        })
        dist.addText(`Realiz.: ${kpi.realizadoLabel ?? '—'}`, {
          x: infoX, y: bY + barH * 0.5, w: infoW, h: barH * 0.5,
          fontSize: 7.5, color: statusPptx(status), bold: true, valign: 'top', align: 'left',
        })
      })

      // Legenda de status
      const legendY = H - 0.85
      const legendItems: { label: string; status: KPIStatus }[] = [
        { label: 'Acima da meta', status: 'above' },
        { label: 'Dentro da meta', status: 'range' },
        { label: 'Abaixo de meta', status: 'below' },
      ]
      legendItems.forEach((item, i) => {
        const lx = MG + i * 2.2
        dist.addShape(pptx.ShapeType.rect, {
          x: lx, y: legendY + 0.06, w: 0.22, h: 0.22,
          fill: { color: statusPptx(item.status) },
          line: { color: statusPptx(item.status), width: 0 },
        })
        dist.addText(item.label, {
          x: lx + 0.3, y: legendY, w: 1.8, h: 0.38,
          fontSize: 8, color: '666666', valign: 'middle',
        })
      })

      addSlideFooter(dist)

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 3 — TABELA DETALHADA (com Meta e Realizado)
      // ════════════════════════════════════════════════════════════════════
      const tbl = pptx.addSlide()
      tbl.background = { color: MRV_COLORS.pWhite }

      tbl.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.75,
        fill: { color: MRV_COLORS.pGreen },
        line: { color: MRV_COLORS.pGreen, width: 0 },
      })
      tbl.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.18, h: 0.75,
        fill: { color: MRV_COLORS.pOrange },
        line: { color: MRV_COLORS.pOrange, width: 0 },
      })
      tbl.addText('Visão Geral das Metas', {
        x: 0.35, y: 0, w: W * 0.65, h: 0.75,
        fontSize: 16, bold: true, color: MRV_COLORS.pWhite, valign: 'middle',
      })
      tbl.addText('KPIs · Pesos · Meta · Realizado · Status', {
        x: W * 0.65, y: 0, w: W * 0.35 - MG, h: 0.75,
        fontSize: 9, color: MRV_COLORS.pOrange, valign: 'middle', align: 'right',
      })

      const hdrOpts = (align: PptxGenJS.HAlign = 'center'): PptxGenJS.TableCellProps => ({
        bold: true,
        color: MRV_COLORS.pWhite,
        fill: { color: MRV_COLORS.pGreenDark },
        align,
        valign: 'middle',
        fontSize: 9,
      })

      const headerCells: PptxGenJS.TableCell[] = [
        { text: 'KPI',        options: hdrOpts('left') },
        { text: 'Grupo',      options: hdrOpts() },
        { text: 'Peso',       options: hdrOpts() },
        { text: 'Gatilho',    options: hdrOpts() },
        { text: 'Meta',       options: hdrOpts() },
        { text: 'Realizado',  options: hdrOpts() },
        { text: 'Realiz. %',  options: hdrOpts() },
        { text: 'Status',     options: hdrOpts() },
      ]

      const bodyRows: PptxGenJS.TableRow[] = kpis.map((kpi, idx) => {
        const status  = getStatus(kpi.valor, kpi.gatilho)
        const rowFill = { color: idx % 2 === 1 ? 'F7F7F7' : MRV_COLORS.pWhite }
        const base: PptxGenJS.TableCellProps = {
          fill: rowFill, valign: 'middle', fontSize: 9, color: MRV_COLORS.pGray,
        }
        const grupo = ['ro', 'mb', 'nps'].includes(kpi.id) ? 'Cluster' : 'Comercial'
        return [
          { text: kpi.name,                    options: { ...base, align: 'left', bold: true } },
          { text: grupo,                        options: { ...base, align: 'center', color: '888888', fontSize: 8 } },
          { text: fmtPeso(kpi.peso),            options: { ...base, align: 'center' } },
          { text: `${kpi.gatilho}%`,            options: { ...base, align: 'center' } },
          { text: kpi.metaLabel ?? '—',         options: { ...base, align: 'center', color: '444444' } },
          { text: kpi.realizadoLabel ?? '—',    options: { ...base, align: 'center', color: statusPptx(status) } },
          { text: `${kpi.valor}%`,              options: { ...base, align: 'center', bold: true, color: statusPptx(status) } },
          { text: getStatusLabel(status),       options: { ...base, align: 'center', bold: true, color: statusPptx(status) } },
        ]
      })

      tbl.addTable([headerCells, ...bodyRows], {
        x: MG, y: 0.9, w: W - MG * 2,
        // KPI(3.0) Grupo(1.0) Peso(0.85) Gatilho(0.85) Meta(1.4) Realizado(1.4) Realiz%(0.9) Status(1.28) = 10.68 → ajustado para w=12.23
        colW: [3.0, 1.0, 0.85, 0.85, 1.55, 1.55, 0.9, 1.48],
        rowH: 0.44,
        border: { type: 'solid', color: 'EEEEEE', pt: 0.5 },
        autoPage: false,
      })

      addSlideFooter(tbl)

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 4 — RESUMO EXECUTIVO (fundo verde, impacto visual alto)
      // ════════════════════════════════════════════════════════════════════
      const exec = pptx.addSlide()
      exec.background = { color: MRV_COLORS.pGreen }

      exec.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.12,
        fill: { color: MRV_COLORS.pOrange },
        line: { color: MRV_COLORS.pOrange, width: 0 },
      })

      exec.addText('RESUMO EXECUTIVO', {
        x: MG, y: 0.5, w: W - MG * 2, h: 0.35,
        fontSize: 8, bold: true, color: MRV_COLORS.pOrange,
        charSpacing: 2, align: 'left',
      })
      exec.addText('Bônus Potencial Estimado', {
        x: MG, y: 0.9, w: W * 0.65, h: 0.75,
        fontSize: 26, bold: true, color: MRV_COLORS.pWhite, align: 'left',
      })

      exec.addText(`${bonusPct.toFixed(1)}%`, {
        x: 0, y: 1.7, w: W, h: 2.0,
        fontSize: 96, bold: true, color: MRV_COLORS.pWhite, align: 'center',
      })
      exec.addText('do bônus potencial total', {
        x: 0, y: 3.65, w: W, h: 0.45,
        fontSize: 13, color: MRV_COLORS.pWhite, transparency: 25, align: 'center',
      })

      exec.addShape(pptx.ShapeType.line, {
        x: W * 0.2, y: 4.25, w: W * 0.6, h: 0,
        line: { color: 'FFFFFF', width: 0.5, transparency: 60 },
      })

      const metrics = [
        { label: 'KPIs\nAtingidos',    value: String(pagos),             color: MRV_COLORS.pWhite },
        { label: 'KPIs Não\nAtingidos', value: String(cortados),         color: MRV_COLORS.pRed   },
        { label: 'Bônus\nEstimado',    value: `${bonusPct.toFixed(1)}%`, color: MRV_COLORS.pOrange },
      ]
      const mW   = 2.8
      const mGap = (W - MG * 2 - metrics.length * mW) / (metrics.length - 1)
      metrics.forEach((m, i) => {
        const mx = MG + i * (mW + mGap)
        exec.addText(m.value, {
          x: mx, y: 4.5, w: mW, h: 0.9,
          fontSize: 38, bold: true, color: m.color, align: 'center',
        })
        exec.addText(m.label, {
          x: mx, y: 5.42, w: mW, h: 0.6,
          fontSize: 10, color: MRV_COLORS.pWhite, transparency: 30,
          align: 'center', breakLine: true,
        })
      })

      exec.addText('Documento de uso interno  ·  MRV&CO  ·  Ciclo 2026', {
        x: MG, y: H - 0.38, w: W - MG * 2, h: 0.3,
        fontSize: 7.5, color: MRV_COLORS.pWhite, transparency: 50, align: 'center',
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
