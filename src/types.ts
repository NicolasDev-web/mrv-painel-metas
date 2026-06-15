export interface KPI {
  id: string
  name: string
  peso: number | null
  gatilho: number
  valor: number
}

export type KPIStatus = 'below' | 'range' | 'above'

export function getStatus(valor: number, gatilho: number): KPIStatus {
  if (valor < gatilho) return 'below'
  if (valor > 100) return 'above'
  return 'range'
}

export function getStatusLabel(status: KPIStatus): string {
  switch (status) {
    case 'below': return 'Abaixo do gatilho'
    case 'range': return 'No range'
    case 'above': return 'Acima da meta'
  }
}

export function getStatusColor(status: KPIStatus): string {
  switch (status) {
    case 'below': return 'var(--mrv-red)'
    case 'range': return 'var(--mrv-green)'
    case 'above': return 'var(--mrv-orange)'
  }
}

export function getStatusBgColor(status: KPIStatus): string {
  switch (status) {
    case 'below': return 'var(--mrv-red-soft)'
    case 'range': return 'var(--mrv-green-soft)'
    case 'above': return 'var(--mrv-orange-soft)'
  }
}
