import { normalizarTelUY } from './telefono'
import type { Casa, EventoCasa, PersonaCasa, ServicioCasa } from './tipos'

export const MAX_NOMBRE_PERSONA = 80
export const MAX_ROL = 80
export const MAX_DETALLE = 500
export const MAX_QUE = 2000
export const MAX_CLAVE = 80
export const MAX_VALOR = 500

export function casaDeParam(v: unknown): Casa {
  return v === 'malibu' ? 'malibu' : 'portofino'
}
export const nombreCasa = (c: Casa): string => (c === 'malibu' ? 'Malibú' : 'Portofino')

const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const esCasa = (v: unknown): v is Casa => v === 'portofino' || v === 'malibu'
const ERR_CASA = 'Elegí la casa.'

type Res<T> = { ok: true; valor: T } | { ok: false; error: string }

export interface EntradaPersonaCasa { casa: string; nombre: string; rol: string; detalle?: string; telefono?: string }

export function validarPersonaCasa(e: EntradaPersonaCasa): Res<Omit<PersonaCasa, 'id' | 'loteId' | 'creadoEn'>> {
  if (!esCasa(e.casa)) return { ok: false, error: ERR_CASA }
  const nombre = txt(e.nombre)
  if (!nombre) return { ok: false, error: 'Escribí el nombre.' }
  if (nombre.length > MAX_NOMBRE_PERSONA) return { ok: false, error: `El nombre puede tener hasta ${MAX_NOMBRE_PERSONA} letras.` }
  const rol = txt(e.rol)
  if (!rol) return { ok: false, error: 'Escribí qué hace (por ejemplo, Limpieza).' }
  if (rol.length > MAX_ROL) return { ok: false, error: `Lo que hace puede tener hasta ${MAX_ROL} letras.` }
  const detalle = txt(e.detalle)
  if (detalle.length > MAX_DETALLE) return { ok: false, error: `El detalle puede tener hasta ${MAX_DETALLE} letras.` }
  const crudo = txt(e.telefono)
  let telefono: string | undefined
  if (crudo) {
    const n = normalizarTelUY(crudo)
    if (!n) return { ok: false, error: 'Revisá el número' }
    telefono = n
  }
  const valor: Omit<PersonaCasa, 'id' | 'loteId' | 'creadoEn'> = { casa: e.casa, nombre, rol }
  if (detalle) valor.detalle = detalle
  if (telefono) valor.telefono = telefono
  return { ok: true, valor }
}

function fechaReal(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(a, mes - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d
}

export interface EntradaEventoCasa { casa: string; que: string; cuando?: string }

export function validarEventoCasa(e: EntradaEventoCasa, hoyStr: string): Res<Omit<EventoCasa, 'id' | 'loteId' | 'creadoEn'>> {
  if (!esCasa(e.casa)) return { ok: false, error: ERR_CASA }
  const que = txt(e.que)
  if (!que) return { ok: false, error: 'Contá qué pasó.' }
  if (que.length > MAX_QUE) return { ok: false, error: `Podés escribir hasta ${MAX_QUE} letras.` }
  const cuando = txt(e.cuando) || hoyStr
  if (!fechaReal(cuando)) return { ok: false, error: 'Revisá la fecha.' }
  return { ok: true, valor: { casa: e.casa, que, cuando } }
}

export interface EntradaServicioCasa { casa: string; clave: string; valor: string }

/** sinValor: Contame guarda el servicio aunque no diga el número (queda en "Para completar"). */
export function validarServicioCasa(e: EntradaServicioCasa, { sinValor = false } = {}): Res<Omit<ServicioCasa, 'id' | 'loteId' | 'creadoEn'>> {
  if (!esCasa(e.casa)) return { ok: false, error: ERR_CASA }
  const clave = txt(e.clave)
  if (!clave) return { ok: false, error: 'Escribí el nombre del servicio.' }
  if (clave.length > MAX_CLAVE) return { ok: false, error: `El servicio puede tener hasta ${MAX_CLAVE} letras.` }
  const valor = txt(e.valor)
  if (!valor && sinValor) return { ok: true, valor: { casa: e.casa, clave, valor: null } }
  if (!valor) return { ok: false, error: 'Escribí el dato (por ejemplo, el número de cliente).' }
  if (valor.length > MAX_VALOR) return { ok: false, error: `El dato puede tener hasta ${MAX_VALOR} letras.` }
  return { ok: true, valor: { casa: e.casa, clave, valor } }
}
