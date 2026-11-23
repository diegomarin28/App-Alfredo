export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // febrero con 29: el 29/2 se permite

export interface EntradaFecha { nombre: string; tipo: string; dia: number; mes: number; anio?: number | null }
export type ResultadoFecha =
  | { ok: true; valor: { nombre: string; tipo: 'cumple' | 'aniversario' | 'otra'; dia: string; anioNacimiento?: number } }
  | { ok: false; error: string }

/** Valida día + mes (29/2 permitido) y devuelve "MM-DD". Compartida por fechas y recordatorios. */
export function validarDiaMes(dia: number, mes: number): { ok: true; valor: string } | { ok: false; error: string } {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { ok: false, error: 'Elegí el mes.' }
  if (!Number.isInteger(dia) || dia < 1) return { ok: false, error: 'Elegí el día.' }
  if (dia > DIAS_MES[mes - 1]) return { ok: false, error: `${MESES[mes - 1]} no tiene ${dia} días.` }
  return { ok: true, valor: `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` }
}

export function validarFecha(e: EntradaFecha, anioActual: number): ResultadoFecha {
  const nombre = (e.nombre ?? '').trim()
  if (!nombre) return { ok: false, error: 'Escribí el nombre.' }
  if (e.tipo !== 'cumple' && e.tipo !== 'aniversario' && e.tipo !== 'otra') return { ok: false, error: 'Elegí qué tipo de fecha es.' }
  const dm = validarDiaMes(e.dia, e.mes)
  if (!dm.ok) return dm
  let anioNacimiento: number | undefined
  if (e.anio != null && !Number.isNaN(e.anio)) {
    if (!Number.isInteger(e.anio) || e.anio < 1900 || e.anio > anioActual) return { ok: false, error: `El año tiene que estar entre 1900 y ${anioActual}.` }
    anioNacimiento = e.anio
  }
  const dia = dm.valor
  return { ok: true, valor: { nombre, tipo: e.tipo, dia, ...(anioNacimiento ? { anioNacimiento } : {}) } }
}
