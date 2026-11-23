export interface Fecha {
  id: string
  nombre: string
  tipo: 'cumple' | 'aniversario' | 'otra'
  /** MM-DD */
  dia: string
  anioNacimiento?: number
}

export interface Recordatorio {
  id: string
  titulo: string
  /** MM-DD; null = fecha todavía no cargada, nunca activo */
  dia: string | null
  avisarDiasAntes: number
  /** YYYY-MM-DD */
  pospuestoHasta?: string
  resueltoAnio?: number
}

export interface Vencimiento {
  id: string
  titulo: string
  ambito: 'empresa' | 'personal'
  /** YYYY-MM-DD */
  fecha: string
  avisarDiasAntes: number
  hecho: boolean
}
