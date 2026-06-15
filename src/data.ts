import { KPI } from './types'

export const clusterKPIs: KPI[] = [
  { id: 'ro', name: 'Resultado operacional ($MM)', peso: 25.0, gatilho: 90, valor: 50, bloco: 'Cluster' },
  { id: 'mb', name: 'Margem bruta NV (%)', peso: 22.5, gatilho: 92, valor: 50, bloco: 'Cluster' },
  { id: 'nps', name: 'NPS morador 6M', peso: 5.0, gatilho: 80, valor: 50, bloco: 'Cluster' },
]

export const specificKPIs: KPI[] = [
  { id: 'rep', name: 'Repasse (unidades)', peso: 22.5, gatilho: 90, valor: 50, bloco: 'Comercial' },
  { id: 'vg', name: 'Venda gerencial', peso: 15.0, gatilho: 90, valor: 50, bloco: 'Comercial' },
  { id: 'risco', name: 'Risco do Prosoluto B', peso: 10.0, gatilho: 80, valor: 50, bloco: 'Comercial' },
  { id: 'desp', name: 'Desp./VGV', peso: null, gatilho: 80, valor: 50, bloco: 'Comercial' },
]
