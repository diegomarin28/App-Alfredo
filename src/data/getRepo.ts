import 'server-only'
import { MemoryRepo } from './memoryRepo'
import { SupabaseRepo } from './supabaseRepo'
import type { Repo } from './repo'

declare global {
  // Next en dev puede cargar cada ruta en un módulo aparte: el repo vive en globalThis.
  var __alfredoRepo: Repo | undefined
}

/**
 * Solo servidor. DATA_BACKEND=memory (por defecto) | supabase.
 * En producción solo vale supabase: se controla al llamar (no al importar) para que `next build` ande sin variables.
 */
export function getRepo(): Repo {
  if (process.env.NODE_ENV === 'production' && process.env.DATA_BACKEND !== 'supabase') {
    throw new Error('En producción hay que configurar DATA_BACKEND=supabase (con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY); los datos en memoria se perderían.')
  }
  return (globalThis.__alfredoRepo ??=
    process.env.DATA_BACKEND === 'supabase'
      ? new SupabaseRepo(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : new MemoryRepo().seed())
}
