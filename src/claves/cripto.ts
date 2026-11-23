/**
 * Cifrado de Contraseñas en el celular (Web Crypto; sirve igual en el navegador y en Node).
 * El servidor nunca ve el texto ni la clave: solo `{ cifrado, iv }` en base64.
 * Las claves derivadas NO se pueden exportar.
 */

const INFO_HKDF = 'alfredo-claves-v1'
const ITERACIONES_PBKDF2 = 600_000
const AES = { name: 'AES-GCM', length: 256 } as const
const USOS: KeyUsage[] = ['encrypt', 'decrypt']

/** Copia a un ArrayBuffer propio (Web Crypto pide BufferSource sobre ArrayBuffer). */
function bytes(x: ArrayBuffer | Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(x instanceof Uint8Array ? x : new Uint8Array(x))
}

export function aBase64(b: ArrayBuffer | Uint8Array): string {
  const u = bytes(b)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s)
}

export function deBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Clave a partir de la salida PRF de la passkey (HKDF-SHA256 → AES-GCM 256). */
export async function derivarClavePrf(prfOutput: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', bytes(prfOutput), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: bytes(salt), info: new TextEncoder().encode(INFO_HKDF) },
    base, AES, false, USOS,
  )
}

/** Clave a partir del PIN de 6 números (PBKDF2-SHA256, 600000 iteraciones → AES-GCM 256). */
export async function derivarClavePin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bytes(salt), iterations: ITERACIONES_PBKDF2 },
    base, AES, false, USOS,
  )
}

/** AES-GCM con IV de 12 bytes al azar. */
export async function cifrar(key: CryptoKey, texto: string): Promise<{ cifrado: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(texto))
  return { cifrado: aBase64(c), iv: aBase64(iv) }
}

/** Lanza si la clave no es la correcta o el dato fue alterado. */
export async function descifrar(key: CryptoKey, { cifrado, iv }: { cifrado: string; iv: string }): Promise<string> {
  const t = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, key, deBase64(cifrado))
  return new TextDecoder().decode(t)
}
