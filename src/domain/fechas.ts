import type { Fecha, Recordatorio, Vencimiento } from './tipos'
import { diasDeAviso, posponerPor, proximaDeRecordatorio, resolverRecordatorio } from './repeticion'

declare global {
  // eslint-disable-next-line no-var
  var __hoyDePrueba: string | undefined
}

const DIA_MS = 86_400_000
const TZ = 'America/Montevideo'

export function hoyMontevideo(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

/** Fija (o limpia con null) el "hoy" en proceso; solo lo usa la ruta de pruebas. */
export function setHoyDePrueba(fecha: string | null): void {
  globalThis.__hoyDePrueba = fecha ?? undefined
}

/** Único origen de "hoy" para pantallas y rutas; nunca usar new Date() directo. */
export function hoy(): string {
  if (process.env.NODE_ENV !== 'production') {
    if (globalThis.__hoyDePrueba) return globalThis.__hoyDePrueba
    if (process.env.TEST_TODAY) return process.env.TEST_TODAY
  }
  return hoyMontevideo(new Date())
}

function aUtc(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function esBisiesto(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function ocurrenciaEn(diaMMDD: string, anio: number): string {
  const dia = diaMMDD === '02-29' && !esBisiesto(anio) ? '02-28' : diaMMDD
  return `${anio}-${dia}`
}

export function diasHasta(fecha: string, hoyStr: string): number {
  return Math.round((aUtc(fecha).getTime() - aUtc(hoyStr).getTime()) / DIA_MS)
}

export function proximaOcurrencia(diaMMDD: string, hoyStr: string): string {
  const anio = Number(hoyStr.slice(0, 4))
  const esteAnio = ocurrenciaEn(diaMMDD, anio)
  return esteAnio >= hoyStr ? esteAnio : ocurrenciaEn(diaMMDD, anio + 1)
}

export function edadQueCumple(f: Fecha, hoyStr: string): number | null {
  if (f.anioNacimiento == null || f.dia === null) return null
  return Number(proximaOcurrencia(f.dia, hoyStr).slice(0, 4)) - f.anioNacimiento
}

/** Los que tienen fecha, del más cercano al más lejano (los sin fecha van a "Para completar"). */
export function proximosCumples(fechas: Fecha[], hoyStr: string) {
  return fechas
    .filter((f): f is Fecha & { dia: string } => f.dia !== null)
    .map(f => {
      const proxima = proximaOcurrencia(f.dia, hoyStr)
      return { ...f, proxima, dias: diasHasta(proxima, hoyStr), edad: edadQueCumple(f, hoyStr) }
    })
    .sort((a, b) => a.dias - b.dias)
}

export function recordatoriosActivos(rs: Recordatorio[], hoyStr: string) {
  const activos: Array<Recordatorio & { proxima: string; dias: number }> = []
  for (const r of rs) {
    const proxima = proximaDeRecordatorio(r, hoyStr)
    if (proxima === null) continue
    const dias = diasHasta(proxima, hoyStr)
    if (dias > diasDeAviso(r)) continue
    const rep = r.repeticion ?? 'anual'
    if ((rep === 'anual' || rep === 'nunca') && r.resueltoAnio === Number(proxima.slice(0, 4))) continue
    if (r.pospuestoHasta && r.pospuestoHasta > hoyStr) continue
    activos.push({ ...r, proxima, dias })
  }
  return activos
}

/** Posponer 15 días (el de siempre); ver posponerPor para elegir cuánto. */
export function posponer(r: Recordatorio, hoyStr: string): Recordatorio {
  return posponerPor(r, hoyStr, r.posponerDias ?? 15)
}

export function resolver(r: Recordatorio, hoyStr: string): Recordatorio {
  return resolverRecordatorio(r, hoyStr)
}

export function vencimientosProximos(vs: Vencimiento[], hoyStr: string) {
  return vs
    .filter(v => !v.hecho)
    .map(v => {
      const dias = diasHasta(v.fecha, hoyStr)
      return { ...v, dias, urgente: dias <= 7 }
    })
    .sort((a, b) => a.dias - b.dias)
}
