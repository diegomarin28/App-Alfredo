export const MAX_ID = 100

/** Id que llega de la pantalla a una acción: texto no vacío y corto. Lo demás se trata como "no existe". */
export function validarId(id: unknown): id is string {
  return typeof id === 'string' && id.trim() !== '' && id.length <= MAX_ID
}
