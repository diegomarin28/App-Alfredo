import { proximosCumples, recordatoriosActivos, vencimientosProximos } from '@/domain/fechas'
import type { Fecha, Recordatorio, Vencimiento } from '@/domain/tipos'

export interface Aviso {
  titulo: string
  cuerpo: string
  url: string
}

export interface DatosAvisos {
  fechas: Fecha[]
  recordatorios: Recordatorio[]
  vencimientos: Vencimiento[]
}

function cuandoVence(dias: number): string {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias > 1) return `En ${dias} días`
  return dias === -1 ? 'Venció hace 1 día' : `Venció hace ${-dias} días`
}

/** Puro: avisos que corresponden al día `hoy` (YYYY-MM-DD, hora de Montevideo). */
export function avisosDelDia(datos: DatosAvisos, hoy: string): Aviso[] {
  const avisos: Aviso[] = []
  for (const c of proximosCumples(datos.fechas.filter((f) => f.tipo === 'cumple'), hoy)) {
    if (c.dias === 0) avisos.push({ titulo: `Hoy cumple ${c.nombre}`, cuerpo: '', url: '/calendario' })
    else if (c.dias === 1) avisos.push({ titulo: `Mañana cumple ${c.nombre}`, cuerpo: '', url: '/calendario' })
  }
  for (const r of recordatoriosActivos(datos.recordatorios, hoy)) {
    const cuerpo = r.dias === 0 ? 'Es hoy' : r.dias === 1 ? 'Falta 1 día' : `Faltan ${r.dias} días`
    avisos.push({ titulo: r.titulo, cuerpo, url: '/recordatorios' })
  }
  for (const v of vencimientosProximos(datos.vencimientos, hoy)) {
    if (v.dias <= v.avisarDiasAntes) avisos.push({ titulo: `Vence ${v.titulo}`, cuerpo: cuandoVence(v.dias), url: '/vencimientos' })
  }
  return avisos
}
