import { MemoryRepo } from './memoryRepo'
import { SupabaseRepo } from './supabaseRepo'
import type { Repo } from './repo'

declare global {
  // Next en dev puede cargar cada ruta en un módulo aparte: el repo vive en globalThis.
  var __alfredoRepo: Repo | undefined
}

/** Solo servidor. DATA_BACKEND=memory (por defecto) | supabase. */
export function getRepo(): Repo {
  return (globalThis.__alfredoRepo ??=
    process.env.DATA_BACKEND === 'supabase'
      ? new SupabaseRepo(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : new MemoryRepo().seed())
}
