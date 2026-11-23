/**
 * Configuración de Contraseñas (solo owner, R20): sal, modo ('prf' | 'pin') y el control "ok" cifrado.
 * Nada de esto es secreto. Se fija una sola vez: con un modo ya elegido o con contraseñas
 * guardadas responde 409, así nunca quedan contraseñas que ya no se puedan abrir.
 */
import type { NextRequest } from 'next/server'
import { validarConfigClaves } from '@/claves/validar'
import { getRepo } from '@/data/getRepo'
import { json, soloOwner } from '../_comun'

export async function GET() {
  const no = await soloOwner()
  if (no) return no
  const { claveSalt, claveModo, claveCheck, claveCheckIv } = await getRepo().getConfig()
  return json({ claveSalt, claveModo, claveCheck, claveCheckIv })
}

export async function POST(req: NextRequest) {
  const no = await soloOwner()
  if (no) return no
  const r = validarConfigClaves(await req.json().catch(() => null))
  if (!r.ok) return json({ error: r.error }, 400)
  const repo = getRepo()
  const actual = await repo.getConfig()
  if (actual.claveModo || actual.claveSalt || (await repo.claves.list()).length > 0) {
    return json({ error: 'Las contraseñas ya están configuradas.' }, 409)
  }
  await repo.setConfig(r.valor)
  return json({ ok: true })
}
