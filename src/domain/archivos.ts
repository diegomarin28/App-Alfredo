import type { Rol } from '@/auth/access'

export const MAX_BYTES = 10 * 1024 * 1024
export const MAX_TITULO = 80
export const MAX_CARPETA = 40

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
}

export const extensionDe = (mime: string): string | null => EXT[mime.toLowerCase()] ?? null

export interface EntradaSubida {
  tipo: unknown; carpetaId?: unknown; titulo?: unknown; mime: string; bytes: number
}
export type ValorSubida =
  | { tipo: 'documento'; carpetaId: string; titulo: string; ext: string }
  | { tipo: 'foto'; ext: string }
type Falla = { ok: false; status: 400 | 403; error: string }

const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** R8/R20: familia solo sube fotos. Lo demás es 400 con mensaje amable. */
export function validarSubida(rol: Rol, e: EntradaSubida): { ok: true; valor: ValorSubida } | Falla {
  if (e.tipo !== 'documento' && e.tipo !== 'foto') return { ok: false, status: 400, error: 'No se pudo subir el archivo.' }
  if (e.tipo === 'documento' && rol !== 'owner') return { ok: false, status: 403, error: 'No tenés permiso para esto.' }
  const ext = extensionDe(e.mime)
  if (!ext) return { ok: false, status: 400, error: 'Solo se pueden subir fotos (JPG, PNG, WebP o HEIC).' }
  if (e.bytes <= 0) return { ok: false, status: 400, error: 'El archivo está vacío.' }
  if (e.bytes > MAX_BYTES) return { ok: false, status: 400, error: 'La foto es muy pesada (máximo 10 MB).' }
  if (e.tipo === 'foto') return { ok: true, valor: { tipo: 'foto', ext } }
  const titulo = txt(e.titulo)
  if (!titulo) return { ok: false, status: 400, error: 'Poné un título' }
  if (titulo.length > MAX_TITULO) return { ok: false, status: 400, error: `El título puede tener hasta ${MAX_TITULO} letras.` }
  const carpetaId = txt(e.carpetaId)
  if (!carpetaId) return { ok: false, status: 400, error: 'Elegí la carpeta.' }
  return { ok: true, valor: { tipo: 'documento', carpetaId, titulo, ext } }
}

/** El path lo genera el servidor; nunca el nombre ni la ruta del cliente. */
export function generarPath(tipo: 'documento' | 'foto', ext: string, carpetaId: string | undefined, uuid: string): string {
  return tipo === 'documento' ? `documentos/${carpetaId}/${uuid}.${ext}` : `fotos/${uuid}.${ext}`
}

/** R4: valida los segmentos de GET /api/archivos/... y el rol. */
export function validarLectura(rol: Rol, segmentos: string[]): { ok: true; path: string } | Falla {
  const malo = { ok: false, status: 400, error: 'Ruta inválida.' } as const
  if (segmentos.length < 2) return malo
  for (const s of segmentos) {
    if (!s || s === '.' || s === '..' || s.includes('\\') || s.includes('/') || s.includes('\0')) return malo
  }
  const raiz = segmentos[0]
  if (raiz !== 'fotos' && raiz !== 'documentos') return malo
  if (rol !== 'owner' && raiz !== 'fotos') return { ok: false, status: 403, error: 'No tenés permiso para esto.' }
  return { ok: true, path: segmentos.join('/') }
}

/** Nombre de carpeta: obligatorio, hasta 40, sin repetir (sin distinguir mayúsculas). */
export function validarCarpeta(nombre: unknown, existentes: string[]): { ok: true; valor: string } | { ok: false; error: string } {
  const n = txt(nombre)
  if (!n) return { ok: false, error: 'Escribí el nombre de la carpeta.' }
  if (n.length > MAX_CARPETA) return { ok: false, error: `El nombre puede tener hasta ${MAX_CARPETA} letras.` }
  const k = n.toLocaleLowerCase('es')
  if (existentes.some((e) => e.trim().toLocaleLowerCase('es') === k)) return { ok: false, error: 'Ya existe una carpeta con ese nombre' }
  return { ok: true, valor: n }
}
