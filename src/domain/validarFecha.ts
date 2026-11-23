export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // febrero con 29: el 29/2 se permite

export interface EntradaFecha { nombre: string; tipo: string; dia: number; mes: number; anio?: number | null }
export type ResultadoFecha =
  | { ok: true; valor: { nombre: string; tipo: 'cumple' | 'aniversario' | 'otra'; dia: string; anioNacimiento?: number } }
  | { ok: false; error: string }

export function validarFecha(e: EntradaFecha, anioActual: number): ResultadoFecha {
  const nombre = (e.nombre ?? '').trim()
  if (!nombre) return { ok: false, error: 'Escribí el nombre.' }
  if (e.tipo !== 'cumple' && e.tipo !== 'aniversario' && e.tipo !== 'otra') return { ok: false, error: 'Elegí qué tipo de fecha es.' }
  if (!Number.isInteger(e.mes) || e.mes < 1 || e.mes > 12) return { ok: false, error: 'Elegí el mes.' }
  if (!Number.isInteger(e.dia) || e.dia < 1) return { ok: false, error: 'Elegí el día.' }
  if (e.dia > DIAS_MES[e.mes - 1]) return { ok: false, error: `${MESES[e.mes - 1]} no tiene ${e.dia} días.` }
  let anioNacimiento: number | undefined
  if (e.anio != null && !Number.isNaN(e.anio)) {
    if (!Number.isInteger(e.anio) || e.anio < 1900 || e.anio > anioActual) return { ok: false, error: `El año tiene que estar entre 1900 y ${anioActual}.` }
    anioNacimiento = e.anio
  }
  const dia = `${String(e.mes).padStart(2, '0')}-${String(e.dia).padStart(2, '0')}`
  return { ok: true, valor: { nombre, tipo: e.tipo, dia, ...(anioNacimiento ? { anioNacimiento } : {}) } }
}
