# CLAUDE.md — Painel de Metas MRV

## O que é este projeto

Dashboard interno da MRV&CO para visualizar e simular o atingimento de metas comerciais do ciclo 2026. O usuário (time Comercial Diretoria) arrasta sliders para simular diferentes níveis de realização e vê em tempo real quanto bônus seria pago.

## Como a simulação de metas funciona

Cada KPI tem três campos-chave:

| Campo | O que significa |
|---|---|
| `gatilho` | Percentual mínimo de realização para o KPI "abrir" (ser pago) |
| `valor` | Percentual de realização atual/simulado (0–120%) |
| `peso` | Quanto esse KPI representa no bônus total (soma = 100%) |

### Os três status possíveis

- **Abaixo do gatilho** (`valor < gatilho`): KPI **não é pago**. Contribuição = 0.
- **No range** (`gatilho ≤ valor ≤ 100`): KPI é pago proporcionalmente. Contribuição = `peso × (valor / 100)`.
- **Acima da meta** (`valor > 100`): KPI é pago no teto. Contribuição = `peso` (100% do peso).

### Exemplo prático

> KPI "Repasse (unidades)": peso 22,5%, gatilho 90%
> - Se realização = 85% → abaixo do gatilho → contribui **0%** no bônus
> - Se realização = 95% → no range → contribui **22,5 × 0,95 = 21,4%**
> - Se realização = 110% → acima da meta → contribui **22,5%** (teto)

### Bônus potencial total

`bonusTotal = soma das contribuições de todos os KPIs com peso`
`bonusMax = soma de todos os pesos (= 100%)`
`percentualBonus = (bonusTotal / bonusMax) × 100`

O gauge semicircular na aba "Simulação" mostra esse percentual em tempo real.

## KPIs configurados

### Cluster (metas compartilhadas)
| ID | Nome | Peso | Gatilho |
|---|---|---|---|
| `ro` | Resultado operacional ($MM) | 25,0% | 90% |
| `mb` | Margem bruta NV (%) | 22,5% | 92% |
| `nps` | NPS morador 6M | 5,0% | 80% |

### Comercial (metas específicas)
| ID | Nome | Peso | Gatilho |
|---|---|---|---|
| `rep` | Repasse (unidades) | 22,5% | 90% |
| `vg` | Venda gerencial | 15,0% | 90% |
| `risco` | Risco do Prosoluto B | 10,0% | 80% |
| `desp` | Desp./VGV | — (sem peso) | 80% |

> `Desp./VGV` não entra no cálculo do bônus (peso nulo) — é monitorado mas não pago.

## Estrutura de arquivos

```
src/
  types.ts          — interface KPI, getStatus(), getStatusLabel(), getStatusColor()
  data.ts           — dados dos KPIs (clusterKPIs, specificKPIs)
  App.tsx           — orquestrador: estado dos sliders, tabs, tema
  styles.css        — variáveis CSS globais (--mrv-green, --mrv-orange, --mrv-red…)
  App.css           — layout do dashboard (header, tabs, grids)
  components/
    KPICard         — card com slider de simulação por KPI
    BonusGauge      — gauge semicircular do bônus potencial
    OverviewTable   — tabela da aba "Visão geral"
    DonutChart      — gráfico de distribuição de pesos (canvas)
    ExportButton    — dropdown para exportar PDF e PPTX
```

## Stack e convenções

- React 18 + TypeScript + Vite
- Sem bibliotecas de UI — CSS puro com variáveis em `styles.css`
- Modo escuro via `[data-theme='dark']` no `<html>`, persistido em `localStorage`
- Cores sempre via CSS variables — nunca hex hardcoded fora de `styles.css`
- Exportação: `jspdf` (PDF programático) + `pptxgenjs` (3 slides)
- `html2canvas` instalado mas não utilizado (exportação é 100% programática)
- TypeScript strict: sem `any`

## Comandos

```bash
npm run dev      # inicia em http://localhost:5173
npm run build    # tsc + vite build
npm run preview  # preview do build de produção
```
