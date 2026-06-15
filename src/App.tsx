import { useState, useEffect } from 'react'
import DonutChart from './components/DonutChart'
import OverviewTable from './components/OverviewTable'
import KPICard from './components/KPICard'
import ExportButton from './components/ExportButton'
import BonusGauge from './components/BonusGauge'
import Icon from './components/Icon'
import { kpis as initialKPIs } from './data'
import { KPI, getStatus } from './types'
import './App.css'

type Tab = 'overview' | 'sim'

type Theme = 'light' | 'dark'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('mrv-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mrv-theme', theme)
  }, [theme])

  const [allKPIs, setAllKPIs] = useState<KPI[]>(initialKPIs.map(k => ({ ...k })))

  const handleChange = (id: string, valor: number) => {
    setAllKPIs(prev => prev.map(k => k.id === id ? { ...k, valor } : k))
  }

  const reset = () => setAllKPIs(initialKPIs.map(k => ({ ...k })))

  const totalPeso = allKPIs.reduce((s, k) => s + (k.peso ?? 0), 0)
  const pagos = allKPIs.filter(k => getStatus(k.valor, k.gatilho) !== 'below').length
  const cortados = allKPIs.length - pagos

  return (
    <>
      {/* TopNavBar full-width */}
      <nav className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <div className="brand">
              <img src="/mrvlogo.png" alt="MRV&CO" className="brand-logo" />
            </div>
            <div className="nav-links">
              <button
                type="button"
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Visão geral
              </button>
              <button
                type="button"
                className={`nav-link ${activeTab === 'sim' ? 'active' : ''}`}
                onClick={() => setActiveTab('sim')}
              >
                Simulação de atingimento
              </button>
            </div>
          </div>
          <div className="topbar-right">
            <ExportButton kpis={allKPIs} />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        {activeTab === 'overview' ? (
          <>
            {/* Header hero full-bleed */}
            <header className="hero">
              <div className="hero-inner">
                <div className="hero-text">
                  <h1>Painel de Metas Comerciais</h1>
                  <p>
                    Acompanhamento executivo de indicadores de desempenho operacional
                    e margem financeira. Comercial Diretoria — Ciclo 2026.
                  </p>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-label">Peso alocado</span>
                  <span className="hero-stat-value">
                    <span className="dot-pulse" />
                    <Icon name="trending_up" size={20} />
                    {totalPeso}%
                  </span>
                </div>
              </div>
            </header>

            <div className="content">
              <div className="overview-grid">
                <DonutChart kpis={allKPIs} theme={theme} />
                <OverviewTable kpis={allKPIs} />
              </div>
            </div>
          </>
        ) : (
          <div className="content">
            {/* Header da simulação */}
            <header className="sim-header">
              <div className="sim-header-text">
                <h1>Simulador de Metas</h1>
                <p>
                  Ajuste os valores de atingimento dos KPIs abaixo para simular o
                  impacto no bônus final e premiações comerciais.
                </p>
              </div>
              <div className="cycle-chip">
                <Icon name="calendar_month" size={18} />
                Ciclo 2026
              </div>
            </header>

            {/* Cards de resumo */}
            <section className="summary-grid">
              <div className="sum-card">
                <span className="sum-label">Total KPIs</span>
                <span className="sum-value">{allKPIs.length}</span>
              </div>
              <div className="sum-card">
                <span className="sum-label">Meta Desejável</span>
                <span className="sum-value">{totalPeso}%</span>
              </div>
              <div className="sum-card tone-green">
                <span className="sum-label">KPIs pagos</span>
                <span className="sum-value">{pagos}</span>
              </div>
              <div className="sum-card tone-red">
                <span className="sum-label">KPIs cortados</span>
                <span className="sum-value">{cortados}</span>
              </div>
            </section>

            {/* Gauge de bônus */}
            <BonusGauge kpis={allKPIs} />

            {/* Lista de KPIs */}
            <section className="kpi-section">
              <div className="section-header">
                <h2>Metas comerciais</h2>
                <button type="button" className="reset-btn" onClick={reset}>
                  <Icon name="refresh" size={18} />
                  Resetar simulação
                </button>
              </div>
              <div className="kpi-grid">
                {allKPIs.map(kpi => (
                  <KPICard key={kpi.id} kpi={kpi} onValueChange={handleChange} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-brand">
            <span className="footer-name">MRV Engenharia</span>
            <p>© 2026 MRV Engenharia. Notas técnicas e legenda de status.</p>
            <p className="footer-note">
              * LI (Limite Inferior): valor mínimo de gatilho para elegibilidade de
              prêmio comercial por KPI.
            </p>
          </div>
          <div className="footer-legend">
            <div className="legend-item">
              <span className="legend-dot tone-red" />
              Vermelho: abaixo do gatilho
            </div>
            <div className="legend-item">
              <span className="legend-dot tone-green" />
              Verde: dentro da meta
            </div>
            <div className="legend-item">
              <span className="legend-dot tone-orange" />
              Laranja: acima da meta
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
