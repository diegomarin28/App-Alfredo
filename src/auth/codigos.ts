import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { familiaVigente } from './access'

const huella = (s: string) => createHash('sha256').update(s, 'utf8').digest()

/** No hay límite de intentos: un código configurado más corto que esto no se acepta nunca. */
export const MIN_CODIGO = 20

const largoSuficiente = (c: string | undefined) => (c && c.length >= MIN_CODIGO ? c : undefined)

/**
 * Compara en tiempo constante (las huellas tienen siempre 32 bytes, así el largo no se filtra).
 * Sin código esperado (env sin configurar) o vacío → false: falla cerrado.
 */
export function codigoIgual(recibido: string | undefined | null, esperado: string | undefined): boolean {
  if (!esperado || typeof recibido !== 'string') return false
  return timingSafeEqual(huella(recibido), huella(esperado))
}

export function codigoConfiguracionValido(codigo: unknown): boolean {
  return codigoIgual(typeof codigo === 'string' ? codigo : null, largoSuficiente(process.env.SETUP_CODE))
}

/** El link de familia sirve si el código coincide con FAMILY_CODE y todavía no venció. */
export function codigoFamiliaValido(codigo: unknown, ahora: Date): boolean {
  const igual = codigoIgual(typeof codigo === 'string' ? codigo : null, largoSuficiente(process.env.FAMILY_CODE))
  return igual && familiaVigente(ahora)
}
