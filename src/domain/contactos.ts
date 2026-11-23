import { normalizarTelUY } from './telefono'
import type { Contacto } from './tipos'

export const MAX_NOMBRE_CONTACTO = 80
export const MAX_EMPRESA = 80
export const MAX_NOTA_CONTACTO = 2000

/** Minúsculas y sin tildes, para buscar sin pensar en acentos. */
export function normalizarBusqueda(t: string): string {
  return t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function coincide(c: { nombre: string; empresa?: string }, busqueda: string): boolean {
  const q = normalizarBusqueda(busqueda)
  if (!q) return true
  return normalizarBusqueda(`${c.nombre} ${c.empresa ?? ''}`).includes(q)
}

/** `59899123456` -> `099 123 456`; fijo `59829001234` -> `2900 1234`; otro número, igual. */
export function formatearTelUY(tel: string): string {
  const m = /^598([9]\d{7}|[24]\d{7})$/.exec(tel)
  if (!m) return tel
  const l = m[1]
  return l.startsWith('9') ? `0${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5)}` : `${l.slice(0, 4)} ${l.slice(4)}`
}

export interface EntradaContacto { nombre: string; tipo: string; empresa?: string; telefono?: string; nota?: string }
export type ResultadoContacto =
  | { ok: true; valor: Omit<Contacto, 'id' | 'loteId' | 'creadoEn'> }
  | { ok: false; error: string }

const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function validarContacto(e: EntradaContacto): ResultadoContacto {
  const nombre = txt(e.nombre)
  if (!nombre) return { ok: false, error: 'Escribí el nombre.' }
  if (nombre.length > MAX_NOMBRE_CONTACTO) return { ok: false, error: `El nombre puede tener hasta ${MAX_NOMBRE_CONTACTO} letras.` }
  if (e.tipo !== 'cliente' && e.tipo !== 'proveedor' && e.tipo !== 'otro') return { ok: false, error: 'Elegí el tipo de contacto.' }
  const empresa = txt(e.empresa)
  if (empresa.length > MAX_EMPRESA) return { ok: false, error: `La empresa puede tener hasta ${MAX_EMPRESA} letras.` }
  const nota = txt(e.nota)
  if (nota.length > MAX_NOTA_CONTACTO) return { ok: false, error: `La nota puede tener hasta ${MAX_NOTA_CONTACTO} letras.` }
  const crudo = txt(e.telefono)
  let telefono: string | undefined
  if (crudo) {
    const n = normalizarTelUY(crudo)
    if (!n) return { ok: false, error: 'Revisá el número' }
    telefono = n
  }
  const valor: Omit<Contacto, 'id' | 'loteId' | 'creadoEn'> = { nombre, tipo: e.tipo }
  if (empresa) valor.empresa = empresa
  if (telefono) valor.telefono = telefono
  if (nota) valor.nota = nota
  return { ok: true, valor }
}
