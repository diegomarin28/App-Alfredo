/** Validación de lo que llega a /api/claves y /api/claves/config. Pura: también la usan los tests. */
import type { ClaveCifrada, Config } from '@/domain/tipos'

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string }

export const MAX_SITIO = 80
export const MAX_USUARIO = 120
/** Largo máximo del texto base64 de `cifrado` (8 KB). */
export const MAX_CIFRADO = 8192
const MAX_CHECK = 1024

/** Bytes que codifica un base64 estándar con relleno; null si no es base64 válido o está vacío. */
export function bytesBase64(s: unknown): number | null {
  if (typeof s !== 'string' || s.length === 0 || s.length % 4 !== 0) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null
  const relleno = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0
  return (s.length / 4) * 3 - relleno
}

const esObjeto = (b: unknown): b is Record<string, unknown> => !!b && typeof b === 'object' && !Array.isArray(b)
/** AES-GCM agrega 16 bytes de etiqueta: un cifrado válido nunca es más corto. */
const cifradoOk = (s: unknown, max: number) => typeof s === 'string' && s.length <= max && (bytesBase64(s) ?? 0) >= 16
const ivOk = (s: unknown) => bytesBase64(s) === 12

export type NuevaClave = Omit<ClaveCifrada, 'id' | 'creadoEn'>

export function validarClave(b: unknown): Resultado<NuevaClave> {
  if (!esObjeto(b)) return { ok: false, error: 'Datos inválidos.' }
  if (typeof b.sitio !== 'string') return { ok: false, error: 'Escribí el sitio.' }
  const sitio = b.sitio.trim()
  if (!sitio) return { ok: false, error: 'Escribí el sitio.' }
  if (sitio.length > MAX_SITIO) return { ok: false, error: `El sitio puede tener hasta ${MAX_SITIO} letras.` }
  if (b.usuario !== undefined && b.usuario !== null && typeof b.usuario !== 'string') return { ok: false, error: 'Usuario inválido.' }
  const usuario = typeof b.usuario === 'string' ? b.usuario.trim() : ''
  if (usuario.length > MAX_USUARIO) return { ok: false, error: `El usuario puede tener hasta ${MAX_USUARIO} letras.` }
  if (!cifradoOk(b.cifrado, MAX_CIFRADO)) return { ok: false, error: 'Contraseña cifrada inválida.' }
  if (!ivOk(b.iv)) return { ok: false, error: 'Contraseña cifrada inválida.' }
  const valor: NuevaClave = { sitio, cifrado: b.cifrado as string, iv: b.iv as string }
  if (usuario) valor.usuario = usuario
  return { ok: true, valor }
}

export type ConfigClaves = Required<Pick<Config, 'claveSalt' | 'claveModo' | 'claveCheck' | 'claveCheckIv'>>

export function validarConfigClaves(b: unknown): Resultado<ConfigClaves> {
  if (!esObjeto(b)) return { ok: false, error: 'Datos inválidos.' }
  if (b.claveModo !== 'prf' && b.claveModo !== 'pin') return { ok: false, error: 'Modo inválido.' }
  if (bytesBase64(b.claveSalt) !== 32) return { ok: false, error: 'Sal inválida.' }
  if (!cifradoOk(b.claveCheck, MAX_CHECK) || !ivOk(b.claveCheckIv)) return { ok: false, error: 'Control inválido.' }
  return {
    ok: true,
    valor: { claveSalt: b.claveSalt as string, claveModo: b.claveModo, claveCheck: b.claveCheck as string, claveCheckIv: b.claveCheckIv as string },
  }
}
