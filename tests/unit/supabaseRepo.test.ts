// @vitest-environment node
// Corre solo con un proyecto de prueba: SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_ROLE_KEY.
import { createClient } from '@supabase/supabase-js'
import { afterAll } from 'vitest'
import { SupabaseRepo } from '@/data/supabaseRepo'
import { repoContract } from './repo.contract'

const url = process.env.SUPABASE_TEST_URL
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY
const habilitado = Boolean(url && key)

repoContract('supabase', async () => new SupabaseRepo(url!, key!), { skip: !habilitado })

afterAll(async () => {
  if (!habilitado) return
  const storage = createClient(url!, key!).storage.from('archivos')
  const { data } = await storage.list('fotos', { search: 'contrato-' })
  if (data?.length) await storage.remove(data.map((f) => `fotos/${f.name}`))
})
