import { useState, useEffect } from 'react'
import DonutChart from './components/DonutChart'
import OverviewTable from './components/OverviewTable'
import KPICard from './components/KPICard'
import ExportButton from './components/ExportButton'
import BonusGauge from './components/BonusGauge'
import { clusterKPIs, specificKPIs } from './data'
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
  const [cluster, setCluster] = useState<KPI[]>(clusterKPIs.map(k => ({ ...k })))
  const [specific, setSpecific] = useState<KPI[]>(specificKPIs.map(k => ({ ...k })))

  const allKPIs = [...cluster, ...specific]

  const handleChange = (id: string, valor: number) => {
    setCluster(prev => prev.map(k => k.id === id ? { ...k, valor } : k))
    setSpecific(prev => prev.map(k => k.id === id ? { ...k, valor } : k))
  }

  const totalPeso = allKPIs.reduce((s, k) => s + (k.peso ?? 0), 0)
  const pagos = allKPIs.filter(k => getStatus(k.valor, k.gatilho) !== 'below').length
  const cortados = allKPIs.length - pagos

  return (
    <>
      {/* Navbar full-width com logo */}
      <nav className="topbar">
        <div className="topbar-inner">
          <img src="/mrvlogo.png" alt="MRV&CO" className="header-logo" />
        </div>
      </nav>

      <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-text">
            <h1>Painel de metas comerciais</h1>
            <p className="header-sub">Comercial Diretoria — Ciclo 2026</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <ExportButton kpis={allKPIs} />
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Visão geral
        </button>
        <button
          className={`tab ${activeTab === 'sim' ? 'active' : ''}`}
          onClick={() => setActiveTab('sim')}
        >
          Simulação de atingimento
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="overview-grid">
          <DonutChart kpis={allKPIs} theme={theme} />
          <OverviewTable kpis={allKPIs} />
        </div>
      )}

      {/* Tab: Simulation */}
      {activeTab === 'sim' && (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="sum-card">
              <span className="sum-label">Total KPIs</span>
              <span className="sum-value">{allKPIs.length}</span>
            </div>
            <div className="sum-card">
              <span className="sum-label">Peso alocado</span>
              <span className="sum-value orange">{totalPeso}%</span>
            </div>
            <div className="sum-card">
              <span className="sum-label">KPIs pagos</span>
              <span className="sum-value green">{pagos}</span>
            </div>
            <div className="sum-card">
              <span className="sum-label">KPIs cortados</span>
              <span className="sum-value red">{cortados}</span>
            </div>
          </div>

          {/* Bonus Gauge */}
          <BonusGauge kpis={[...cluster, ...specific]} />

          {/* Cluster KPIs */}
          <div className="section-header">
            <span>📊</span>
            <h2>Metas por cluster</h2>
          </div>
          {cluster.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} onValueChange={handleChange} />
          ))}

          {/* Specific KPIs */}
          <div className="section-header">
            <span>🎯</span>
            <h2>Metas específicas — comercial</h2>
          </div>
          {specific.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} onValueChange={handleChange} />
          ))}

          {/* Legend */}
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--mrv-red)' }} />
              Abaixo do gatilho
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--mrv-green)' }} />
              No range
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--mrv-orange)' }} />
              Acima da meta
            </div>
          </div>
          <p className="footer-note">
            LI = Limite inferior. Abaixo do gatilho, o KPI não é pago no bônus.
          </p>
        </>
      )}
      </div>
    </>
  )
}
