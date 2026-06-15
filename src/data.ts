import { KPI } from './types'

export const kpis: KPI[] = [
  { id: 'ro', name: 'Resultado operacional ($MM)', peso: 25.0, gatilho: 90, valor: 50 },
  { id: 'mb', name: 'Margem bruta NV (%)', peso: 22.5, gatilho: 92, valor: 50 },
  { id: 'nps', name: 'NPS morador 6M', peso: 5.0, gatilho: 80, valor: 50 },
  { id: 'rep', name: 'Repasse (unidades)', peso: 22.5, gatilho: 90, valor: 50 },
  { id: 'vg', name: 'Venda gerencial', peso: 15.0, gatilho: 90, valor: 50 },
  { id: 'risco', name: 'Risco do Prosoluto B', peso: 10.0, gatilho: 80, valor: 50 },
]
