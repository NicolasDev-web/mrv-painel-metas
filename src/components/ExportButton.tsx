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
      const mg = 18 // margem generosa para respiro

      // ── utilidades de rodapé ──────────────────────────────────────────────
      function addFooter(pageNum: number, pageTotal: number) {
        doc.setPage(pageNum)
        // linha divisória sutil
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

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 1 — CAPA
      // ════════════════════════════════════════════════════════════════════════

      // Fundo verde escuro total
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(0, 0, pageW, pageH, 'F')

      // Barra decorativa laranja lateral esquerda
      doc.setFillColor(MRV_COLORS.orange)
      doc.rect(0, 0, 6, pageH, 'F')

      // Bloco branco "cartão" centralizado
      const cardX = 40
      const cardY = 35
      const cardW = pageW - 80
      const cardH = 115
      doc.setFillColor('#FFFFFF')
      doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')

      // Linha verde no topo do cartão
      doc.setFillColor(MRV_COLORS.green)
      doc.rect(cardX, cardY, cardW, 3, 'F')

      // Label "RELATÓRIO DE METAS" pequeno e espaçado
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('RELATÓRIO DE METAS  ·  CICLO 2026', cardX + 18, cardY + 18, { charSpace: 1.5 })

      // Título principal
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(28)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Painel de Metas', cardX + 18, cardY + 36)
      doc.text('Comerciais', cardX + 18, cardY + 50)

      // Linha divisória no cartão
      doc.setDrawColor('#E0E0E0')
      doc.setLineWidth(0.4)
      doc.line(cardX + 18, cardY + 58, cardX + cardW - 18, cardY + 58)

      // Subtítulo
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor('#555555')
      doc.text('Comercial Diretoria', cardX + 18, cardY + 70)

      // Data
      doc.setFontSize(9.5)
      doc.setTextColor('#888888')
      doc.text(`Gerado em ${todayBR()}`, cardX + 18, cardY + 82)

      // Badge bônus
      const { pagos, cortados, bonusPct } = summarize(kpis)
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

      // Marca MRV&CO no rodapé do cartão
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text('MRV&CO', cardX + 18, cardY + cardH - 8)

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 2 — TABELA DETALHADA
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage()

      // Header com faixa verde
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
      doc.text('KPIs · Pesos · Realizações · Status', pageW - mg, 14, { align: 'right' })

      // Tabela
      const cols = [
        { label: 'KPI', w: 92 },
        { label: 'Grupo', w: 34 },
        { label: 'Peso', w: 28 },
        { label: 'Gatilho', w: 28 },
        { label: 'Realização', w: 36 },
        { label: 'Status', w: 52 },
      ]
      const tableX = mg
      const tableW = pageW - mg * 2
      const rowH = 9
      let y = 34

      const colX = (idx: number) =>
        tableX + cols.slice(0, idx).reduce((s, c) => s + c.w, 0)

      // Cabeçalho da tabela
      doc.setFillColor('#1A3A2D') // verde mais escuro que o header para contraste
      doc.rect(tableX, y, tableW, rowH + 1, 'F')
      doc.setTextColor(MRV_COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      cols.forEach((c, i) => doc.text(c.label, colX(i) + 3, y + 6.5))
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

        doc.setTextColor(MRV_COLORS.gray)
        doc.setFontSize(8.5)
        doc.text(kpi.name, colX(0) + 5, y + 6, { maxWidth: cols[0].w - 7 })

        // Grupo: Cluster vs Comercial (heurística: peso >= 20 e id in ro/mb → Cluster)
        const grupo = ['ro', 'mb', 'nps'].includes(kpi.id) ? 'Cluster' : 'Comercial'
        doc.setFontSize(7.5)
        doc.setTextColor('#888888')
        doc.text(grupo, colX(1) + 3, y + 6)

        doc.setFontSize(8.5)
        doc.setTextColor(MRV_COLORS.gray)
        doc.text(fmtPeso(kpi.peso), colX(2) + 3, y + 6)
        doc.text(`${kpi.gatilho}%`, colX(3) + 3, y + 6)

        // Realização: negrito e colorida pelo status
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(statusHex(status))
        doc.text(`${kpi.valor}%`, colX(4) + 3, y + 6)

        // Badge de status
        const statusBg: Record<KPIStatus, string> = {
          below: '#FDECEA',
          range: '#E8F5E9',
          above: '#FFF3E0',
        }
        doc.setFillColor(statusBg[status])
        doc.roundedRect(colX(5) + 2, y + 1.5, cols[5].w - 4, rowH - 3, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(statusHex(status))
        doc.text(getStatusLabel(status), colX(5) + (cols[5].w / 2), y + 6.2, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        y += rowH
      })

      // Linha de total
      const { totalPeso } = summarize(kpis)
      doc.setFillColor(MRV_COLORS.greenSoft)
      doc.rect(tableX, y, tableW, rowH + 1, 'F')
      doc.setDrawColor(MRV_COLORS.green)
      doc.setLineWidth(0.5)
      doc.line(tableX, y, tableX + tableW, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Total ponderado', colX(0) + 5, y + 7)
      doc.text(`${totalPeso.toFixed(1)}%`, colX(2) + 3, y + 7)

      addFooter(2, 3)

      // ════════════════════════════════════════════════════════════════════════
      // PÁGINA 3 — RESUMO EXECUTIVO
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage()

      // Header
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
        { label: 'KPIs Atingidos', value: String(pagos), sub: 'com realização ≥ gatilho', color: MRV_COLORS.green, bg: MRV_COLORS.greenSoft },
        { label: 'KPIs Não Atingidos', value: String(cortados), sub: 'abaixo do gatilho', color: MRV_COLORS.red, bg: '#FDECEA' },
        { label: 'Bônus Potencial', value: `${bonusPct.toFixed(1)}%`, sub: 'do total ponderado', color: MRV_COLORS.orange, bg: '#FFF3E0' },
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
        doc.line(cX, cY, cX + cW, cY) // linha de topo colorida
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor('#666666')
        doc.text(card.label, cX + cW / 2, cY + 10, { align: 'center' })
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(26)
        doc.setTextColor(card.color)
        doc.text(card.value, cX + cW / 2, cY + 30, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor('#888888')
        doc.text(card.sub, cX + cW / 2, cY + 42, { align: 'center' })
      })

      // Indicadores por status (mini-tabela textual)
      const statusGroups: { status: KPIStatus; label: string }[] = [
        { status: 'above', label: 'Acima da meta' },
        { status: 'range', label: 'Dentro da meta' },
        { status: 'below', label: 'Abaixo de meta' },
      ]
      let gy = cY + cH + 18
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(MRV_COLORS.green)
      doc.text('Distribuição por status', mg, gy)
      gy += 8

      statusGroups.forEach(({ status, label }) => {
        const items = kpis.filter(k => getStatus(k.valor, k.gatilho) === status)
        if (items.length === 0) return
        // Título do grupo
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
      // Resultado à direita
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(MRV_COLORS.orange)
      doc.text(
        `${pagos} de ${kpis.length} KPIs atingidos`,
        pageW - mg - 4, pqY + 17, { align: 'right' },
      )

      // Rodapé páginas 1 e 3
      addFooter(1, 3)
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
        slide.addText('MRV&CO  ·  Comercial Diretoria  ·  Ciclo 2026', {
          x: MG, y: H - 0.38, w: W * 0.6, h: 0.3,
          fontSize: 7.5, color: '#AAAAAA', align: 'left',
        })
        slide.addText(todayBR(), {
          x: W - MG - 1.5, y: H - 0.38, w: 1.5, h: 0.3,
          fontSize: 7.5, color: '#AAAAAA', align: 'right',
        })
        // linha divisória
        slide.addShape(pptx.ShapeType.line, {
          x: MG, y: H - 0.42, w: W - MG * 2, h: 0,
          line: { color: 'DDDDDD', width: 0.5 },
        })
      }

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 1 — CAPA
      // ════════════════════════════════════════════════════════════════════
      const cover = pptx.addSlide()

      // Metade esquerda: fundo verde
      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W * 0.55, h: H,
        fill: { color: MRV_COLORS.green },
        line: { color: MRV_COLORS.green, width: 0 },
      })
      // Metade direita: fundo cinza claro
      cover.addShape(pptx.ShapeType.rect, {
        x: W * 0.55, y: 0, w: W * 0.45, h: H,
        fill: { color: '#F2F2F2' },
        line: { color: '#F2F2F2', width: 0 },
      })
      // Barra laranja de sotaque no topo esquerdo
      cover.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W * 0.55, h: 0.12,
        fill: { color: MRV_COLORS.orange },
        line: { color: MRV_COLORS.orange, width: 0 },
      })

      // Label eyebrow
      cover.addText('RELATÓRIO DE METAS  ·  CICLO 2026', {
        x: MG, y: 1.8, w: W * 0.5, h: 0.3,
        fontSize: 8, bold: true, color: MRV_COLORS.orange,
        charSpacing: 2, align: 'left',
      })
      // Título H1
      cover.addText('Painel de Metas\nComerciais', {
        x: MG, y: 2.2, w: W * 0.5, h: 1.9,
        fontSize: 38, bold: true, color: MRV_COLORS.white, align: 'left',
        breakLine: true,
      })
      // Subtítulo
      cover.addText('Comercial Diretoria', {
        x: MG, y: 4.35, w: W * 0.5, h: 0.45,
        fontSize: 14, color: MRV_COLORS.white, transparency: 25, align: 'left',
      })
      // Data
      cover.addText(`Gerado em ${todayBR()}`, {
        x: MG, y: 6.8, w: W * 0.5, h: 0.35,
        fontSize: 9, color: MRV_COLORS.white, transparency: 45, align: 'left',
      })

      // Painel de bônus na coluna direita
      const panelX = W * 0.55 + 0.6
      const panelW = W * 0.45 - 1.2
      cover.addText('Bônus potencial estimado', {
        x: panelX, y: 1.8, w: panelW, h: 0.4,
        fontSize: 10, color: '#888888', align: 'center',
      })
      cover.addText(`${bonusPct.toFixed(1)}%`, {
        x: panelX, y: 2.3, w: panelW, h: 1.4,
        fontSize: 72, bold: true, color: MRV_COLORS.green, align: 'center',
      })
      cover.addShape(pptx.ShapeType.line, {
        x: panelX + panelW * 0.1, y: 3.85, w: panelW * 0.8, h: 0,
        line: { color: 'DDDDDD', width: 0.6 },
      })
      cover.addText(`${pagos} KPIs atingidos  ·  ${cortados} não atingidos`, {
        x: panelX, y: 4.05, w: panelW, h: 0.4,
        fontSize: 10, color: '#666666', align: 'center',
      })
      // MRV&CO marca
      cover.addText('MRV&CO', {
        x: panelX, y: 6.7, w: panelW, h: 0.45,
        fontSize: 18, bold: true, color: MRV_COLORS.orange, align: 'center',
      })

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 2 — DISTRIBUIÇÃO DE PESOS (visão de impacto)
      // ════════════════════════════════════════════════════════════════════
      const dist = pptx.addSlide()
      dist.background = { color: MRV_COLORS.white }

      // Header strip
      dist.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.75,
        fill: { color: MRV_COLORS.green },
        line: { color: MRV_COLORS.green, width: 0 },
      })
      dist.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.18, h: 0.75,
        fill: { color: MRV_COLORS.orange },
        line: { color: MRV_COLORS.orange, width: 0 },
      })
      dist.addText('Distribuição de Pesos por KPI', {
        x: 0.35, y: 0, w: W * 0.65, h: 0.75,
        fontSize: 16, bold: true, color: MRV_COLORS.white, valign: 'middle',
      })
      dist.addText('Impacto de cada indicador no bônus total', {
        x: W * 0.65, y: 0, w: W * 0.35 - MG, h: 0.75,
        fontSize: 9, color: MRV_COLORS.orange, valign: 'middle', align: 'right',
      })

      // Barras horizontais por KPI
      const barStartY = 1.05
      const barH = 0.48
      const barGap = 0.14
      const maxBarW = W - MG * 2 - 3.8 // espaço para label e valor
      const labelW = 3.2

      kpis.forEach((kpi, i) => {
        const status = getStatus(kpi.valor, kpi.gatilho)
        const peso = kpi.peso ?? 0
        const bY = barStartY + i * (barH + barGap)
        const barFill = peso > 0 ? statusHex(status) : '#CCCCCC'
        const barW = peso > 0 ? (peso / 25) * maxBarW : 0.15

        // Label KPI
        dist.addText(kpi.name, {
          x: MG, y: bY, w: labelW, h: barH,
          fontSize: 9.5, color: MRV_COLORS.gray, valign: 'middle', align: 'left',
        })
        // Barra fundo cinza (track)
        dist.addShape(pptx.ShapeType.rect, {
          x: MG + labelW, y: bY + barH * 0.28, w: maxBarW, h: barH * 0.44,
          fill: { color: 'EEEEEE' }, line: { color: 'EEEEEE', width: 0 },
        })
        // Barra preenchida
        if (barW > 0) {
          dist.addShape(pptx.ShapeType.rect, {
            x: MG + labelW, y: bY + barH * 0.28, w: barW, h: barH * 0.44,
            fill: { color: barFill }, line: { color: barFill, width: 0 },
          })
        }
        // Valor do peso
        dist.addText(fmtPeso(kpi.peso), {
          x: MG + labelW + maxBarW + 0.1, y: bY, w: 0.7, h: barH,
          fontSize: 9.5, bold: true, color: barFill, valign: 'middle', align: 'left',
        })
        // Status tag
        dist.addText(getStatusLabel(status), {
          x: MG + labelW + maxBarW + 0.85, y: bY + 0.06, w: 1.5, h: barH - 0.12,
          fontSize: 7.5, bold: true, color: statusHex(status),
          valign: 'middle', align: 'center',
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
        const lx = MG + i * 2.1
        dist.addShape(pptx.ShapeType.rect, {
          x: lx, y: legendY + 0.06, w: 0.25, h: 0.25,
          fill: { color: statusHex(item.status) },
          line: { color: statusHex(item.status), width: 0 },
        })
        dist.addText(item.label, {
          x: lx + 0.32, y: legendY, w: 1.7, h: 0.38,
          fontSize: 8, color: '#666666', valign: 'middle',
        })
      })

      addSlideFooter(dist)

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 3 — TABELA DETALHADA
      // ════════════════════════════════════════════════════════════════════
      const tbl = pptx.addSlide()
      tbl.background = { color: MRV_COLORS.white }

      // Header strip
      tbl.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.75,
        fill: { color: MRV_COLORS.green },
        line: { color: MRV_COLORS.green, width: 0 },
      })
      tbl.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.18, h: 0.75,
        fill: { color: MRV_COLORS.orange },
        line: { color: MRV_COLORS.orange, width: 0 },
      })
      tbl.addText('Visão Geral das Metas', {
        x: 0.35, y: 0, w: W * 0.65, h: 0.75,
        fontSize: 16, bold: true, color: MRV_COLORS.white, valign: 'middle',
      })
      tbl.addText('KPIs · Pesos · Realizações · Status', {
        x: W * 0.65, y: 0, w: W * 0.35 - MG, h: 0.75,
        fontSize: 9, color: MRV_COLORS.orange, valign: 'middle', align: 'right',
      })

      const headerCells: PptxGenJS.TableCell[] = [
        { text: 'KPI', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'left', valign: 'middle', fontSize: 10 } },
        { text: 'Grupo', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'center', valign: 'middle', fontSize: 10 } },
        { text: 'Peso', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'center', valign: 'middle', fontSize: 10 } },
        { text: 'Gatilho', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'center', valign: 'middle', fontSize: 10 } },
        { text: 'Realização', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'center', valign: 'middle', fontSize: 10 } },
        { text: 'Status', options: { bold: true, color: MRV_COLORS.white, fill: { color: '#1A3A2D' }, align: 'center', valign: 'middle', fontSize: 10 } },
      ]

      const bodyRows: PptxGenJS.TableRow[] = kpis.map((kpi, idx) => {
        const status = getStatus(kpi.valor, kpi.gatilho)
        const rowFill = { color: idx % 2 === 1 ? 'F7F7F7' : MRV_COLORS.white }
        const base: PptxGenJS.TableCellProps = { fill: rowFill, valign: 'middle', fontSize: 10, color: MRV_COLORS.gray }
        const grupo = ['ro', 'mb', 'nps'].includes(kpi.id) ? 'Cluster' : 'Comercial'
        return [
          { text: kpi.name, options: { ...base, align: 'left', bold: true } },
          { text: grupo, options: { ...base, align: 'center', color: '#888888', fontSize: 9 } },
          { text: fmtPeso(kpi.peso), options: { ...base, align: 'center' } },
          { text: `${kpi.gatilho}%`, options: { ...base, align: 'center' } },
          { text: `${kpi.valor}%`, options: { ...base, align: 'center', bold: true, color: statusHex(status) } },
          { text: getStatusLabel(status), options: { ...base, align: 'center', bold: true, color: statusHex(status) } },
        ]
      })

      tbl.addTable([headerCells, ...bodyRows], {
        x: MG, y: 0.95, w: W - MG * 2,
        colW: [3.8, 1.3, 1.1, 1.1, 1.4, 1.98],
        rowH: 0.44,
        border: { type: 'solid', color: 'EEEEEE', pt: 0.5 },
        autoPage: false,
      })

      addSlideFooter(tbl)

      // ════════════════════════════════════════════════════════════════════
      // SLIDE 4 — RESUMO EXECUTIVO (fundo verde, impacto alto)
      // ════════════════════════════════════════════════════════════════════
      const exec = pptx.addSlide()
      exec.background = { color: MRV_COLORS.green }

      // Barra laranja no topo
      exec.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: 0.12,
        fill: { color: MRV_COLORS.orange },
        line: { color: MRV_COLORS.orange, width: 0 },
      })

      // Eyebrow
      exec.addText('RESUMO EXECUTIVO', {
        x: MG, y: 0.5, w: W - MG * 2, h: 0.35,
        fontSize: 8, bold: true, color: MRV_COLORS.orange,
        charSpacing: 2, align: 'left',
      })
      exec.addText('Bônus Potencial Estimado', {
        x: MG, y: 0.9, w: W * 0.65, h: 0.75,
        fontSize: 26, bold: true, color: MRV_COLORS.white, align: 'left',
      })

      // Número grande centralizado
      exec.addText(`${bonusPct.toFixed(1)}%`, {
        x: 0, y: 1.7, w: W, h: 2.0,
        fontSize: 96, bold: true, color: MRV_COLORS.white, align: 'center',
      })
      exec.addText('do bônus potencial total', {
        x: 0, y: 3.65, w: W, h: 0.45,
        fontSize: 13, color: MRV_COLORS.white, transparency: 25, align: 'center',
      })

      // Linha divisória
      exec.addShape(pptx.ShapeType.line, {
        x: W * 0.2, y: 4.25, w: W * 0.6, h: 0,
        line: { color: 'FFFFFF', width: 0.5, transparency: 60 },
      })

      // Três métricas abaixo
      const metrics = [
        { label: 'KPIs\nAtingidos', value: String(pagos), color: MRV_COLORS.white },
        { label: 'KPIs Não\nAtingidos', value: String(cortados), color: MRV_COLORS.red },
        { label: 'Bônus\nEstimado', value: `${bonusPct.toFixed(1)}%`, color: MRV_COLORS.orange },
      ]
      const mW = 2.8
      const mGap = (W - MG * 2 - metrics.length * mW) / (metrics.length - 1)
      metrics.forEach((m, i) => {
        const mx = MG + i * (mW + mGap)
        exec.addText(m.value, {
          x: mx, y: 4.5, w: mW, h: 0.9,
          fontSize: 38, bold: true, color: m.color, align: 'center',
        })
        exec.addText(m.label, {
          x: mx, y: 5.42, w: mW, h: 0.6,
          fontSize: 10, color: MRV_COLORS.white, transparency: 30,
          align: 'center', breakLine: true,
        })
      })

      // Rodapé da capa executiva
      exec.addText('Documento de uso interno  ·  MRV&CO  ·  Ciclo 2026', {
        x: MG, y: H - 0.38, w: W - MG * 2, h: 0.3,
        fontSize: 7.5, color: MRV_COLORS.white, transparency: 50, align: 'center',
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
