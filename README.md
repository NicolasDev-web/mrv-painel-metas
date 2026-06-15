# Painel de Metas — MRV&CO

Dashboard executivo interativo para acompanhamento de metas comerciais da MRV.

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:5173
```

## Funcionalidades

### Aba "Visão geral"
- Gráfico de rosca com distribuição dos pesos de cada KPI
- Tabela completa com todas as metas, bloco (Cluster/Comercial), peso com barra visual e gatilho
- Linha de total com soma dos pesos

### Aba "Simulação de atingimento"
- Sliders interativos (0–120%) para simular cenários de realização
- Cards de resumo dinâmico (KPIs pagos vs cortados)
- Indicadores visuais de status: abaixo do gatilho, no range, acima da meta
- Barras de progresso coloridas por status

## Estrutura do projeto

```
mrv-painel-metas/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx             # Layout principal com abas
│   ├── App.css
│   ├── styles.css          # Variáveis globais da identidade MRV
│   ├── types.ts            # Tipos e funções utilitárias (status, cores)
│   ├── data.ts             # Dados dos KPIs (edite aqui para alterar metas)
│   └── components/
│       ├── DonutChart.tsx   # Gráfico de rosca dos pesos
│       ├── DonutChart.css
│       ├── OverviewTable.tsx # Tabela resumo de todas as metas
│       ├── OverviewTable.css
│       ├── KPICard.tsx      # Card individual com slider
│       └── KPICard.css
```

## Como editar os KPIs

Abra `src/data.ts` e altere os arrays:

```ts
{ id: 'ro', name: 'Resultado operacional ($MM)', peso: 25.0, gatilho: 90, valor: 50, bloco: 'Cluster' }
```

- **peso**: peso no bônus (use `null` se não aplicável)
- **gatilho**: limite inferior para pagamento (%)
- **valor**: valor inicial do slider (%)
- **bloco**: `'Cluster'` ou `'Comercial'`

## Build para produção

```bash
npm run build
```

Arquivos otimizados gerados em `dist/`.
