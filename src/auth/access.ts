/**
 * Matriz de acceso. Puro y sin dependencias de servidor: lo usa el middleware (Edge).
 * Lo que no figura acá como permitido está prohibido (lista blanca).
 */

export type Rol = 'owner' | 'familia'

export interface Sesion {
  rol: Rol
  /** ISO; solo familia: hasta cuándo vale */
  expira?: string
}

export const FAMILY_EXPIRES_AT_POR_DEFECTO = '2026-11-25T23:59:00-03:00'

/** Momento en que muere el modo familia (env FAMILY_EXPIRES_AT). Inválido → Invalid Date (cierra todo). */
export function familiaVence(): Date {
  return new Date(process.env.FAMILY_EXPIRES_AT || FAMILY_EXPIRES_AT_POR_DEFECTO)
}

/** true solo si `ahora` es estrictamente antes del vencimiento. Fechas inválidas → false. */
function antesDe(ahora: Date, limite: Date): boolean {
  return ahora.getTime() < limite.getTime()
}

export function familiaVigente(ahora: Date): boolean {
  return antesDe(ahora, familiaVence())
}

/** `path` es `base` o está debajo de `base` (no `/fotosecretas` para `/fotos`). */
function bajo(path: string, base: string): boolean {
  return path === base || path.startsWith(base + '/')
}

const PUBLICAS = ['/entrar', '/configurar', '/familia', '/api/auth', '/api/cron', '/api/test', '/_next']
const ESTATICOS = [/^\/manifest\.webmanifest$/, /^\/icon-[^/]*\.png$/, /^\/apple-touch-icon[^/]*$/, /^\/sw\.js$/, /^\/favicon\.ico$/]

/** Rutas que no piden sesión (las de cron y test tienen su propio control). */
export function esPublica(path: string): boolean {
  return PUBLICAS.some((b) => bajo(path, b)) || ESTATICOS.some((r) => r.test(path))
}

export function esApi(path: string): boolean {
  return bajo(path, '/api')
}

const FAMILIA_PAGINAS = ['/calendario', '/recordatorios', '/casas', '/fotos']
/** /api/archivos: la ruta misma restringe a fotos/ (Task 11). */
const FAMILIA_APIS = ['/api/recordatorios', '/api/fechas', '/api/casas', '/api/fotos', '/api/archivos']

/** Decide acceso a una ruta NO pública. */
export function puedeVer(rol: Rol | null, path: string, ahora: Date): boolean {
  if (rol === 'owner') return true
  if (rol !== 'familia') return false
  if (!familiaVigente(ahora)) return false
  return path === '/' || FAMILIA_PAGINAS.some((b) => bajo(path, b)) || FAMILIA_APIS.some((b) => bajo(path, b))
}

/**
 * ¿Se puede registrar una passkey? La primera, sí (con SETUP_CODE). Después, solo desde una sesión de owner:
 * así el SETUP_CODE deja de dar acceso de owner una vez configurado Face ID.
 */
export function registroPermitido(passkeysGuardadas: number, sesion: Sesion | null): boolean {
  return passkeysGuardadas === 0 || sesion?.rol === 'owner'
}

/** Valida lo que salió de la cookie. Familia vencida (por env o por su `expira`) → null. */
export function sesionVigente(datos: unknown, ahora: Date): Sesion | null {
  if (!datos || typeof datos !== 'object') return null
  const { rol, expira } = datos as Record<string, unknown>
  if (rol === 'owner') return { rol: 'owner' }
  if (rol !== 'familia' || !familiaVigente(ahora)) return null
  if (typeof expira !== 'string' || !antesDe(ahora, new Date(expira))) return null
  return { rol: 'familia', expira }
}
