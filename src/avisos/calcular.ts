import { cantidad, enDias } from '@/domain/cantidades'
import { proximosCumples, recordatoriosActivos, vencimientosProximos } from '@/domain/fechas'
import type { Fecha, Recordatorio, Vencimiento } from '@/domain/tipos'
import { proximaDeFecha } from '@/domain/repeticion'

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
  return enDias(dias, { ayer: false })
}

/** Puro: avisos que corresponden al día `hoy` (YYYY-MM-DD, hora de Montevideo). */
export function avisosDelDia(datos: DatosAvisos, hoy: string): Aviso[] {
  const avisos: Aviso[] = []
  for (const c of proximosCumples(datos.fechas.filter((f) => f.tipo === 'cumple'), hoy)) {
    if (c.dias === 0) avisos.push({ titulo: `Hoy cumple ${c.nombre}`, cuerpo: '', url: '/calendario' })
    else if (c.dias === 1) avisos.push({ titulo: `Mañana cumple ${c.nombre}`, cuerpo: '', url: '/calendario' })
  }
  // Las fechas "Otra" (aniversarios, reuniones…) avisan el día que caen.
  for (const f of datos.fechas) {
    if (f.tipo !== 'otra' || proximaDeFecha(f, hoy) !== hoy) continue
    avisos.push({ titulo: `Hoy: ${f.nombre}`, cuerpo: f.hora ? `A las ${f.hora.slice(0, 5)}` : '', url: '/calendario' })
  }
  for (const r of recordatoriosActivos(datos.recordatorios, hoy)) {
    const cuerpo = r.dias === 0 ? 'Es hoy' : r.dias === 1 ? 'Falta 1 día' : `Faltan ${cantidad(r.dias, 'día')}`
    avisos.push({ titulo: r.titulo, cuerpo, url: '/recordatorios' })
  }
  for (const v of vencimientosProximos(datos.vencimientos, hoy)) {
    if (v.dias <= v.avisarDiasAntes) avisos.push({ titulo: `Vence ${v.titulo}`, cuerpo: cuandoVence(v.dias), url: '/vencimientos' })
  }
  return avisos
}
