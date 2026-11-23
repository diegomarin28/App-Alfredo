/** Ayudas puras para SupabaseRepo (sin cliente real: se prueban con fakes). */

/** PostgREST corta cada respuesta en 1000 filas (max_rows). */
export const PAGINA = 1000

export type ErrorDb = { message: string; code?: string } | null

export function falla(error: ErrorDb, donde: string): void {
  if (error) throw new Error(`Supabase (${donde}): ${error.message}`)
}

/**
 * Lee todas las filas pidiendo páginas [desde, hasta] de PAGINA filas hasta que una viene incompleta.
 * La consulta tiene que tener un orden total (por eso el desempate por id).
 */
export async function leerTodo<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: ErrorDb }>,
  donde: string,
): Promise<T[]> {
  const todas: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pagina(desde, desde + PAGINA - 1)
    falla(error, donde)
    const filas = data ?? []
    todas.push(...filas)
    if (filas.length < PAGINA) return todas
  }
}

/** 22P02: el id no es un uuid válido. Para el repo es lo mismo que "no existe" (igual que en memoria). */
export function esIdInvalido(error: ErrorDb): boolean {
  return error?.code === '22P02'
}
