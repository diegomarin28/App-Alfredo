/**
 * Contraseñas cifradas (solo owner, R20). El servidor guarda y devuelve únicamente
 * { id, sitio, usuario, cifrado, iv }: nunca recibe el texto ni la clave.
 */
import type { NextRequest } from 'next/server'
import { validarClave } from '@/claves/validar'
import { getRepo } from '@/data/getRepo'
import { json, soloOwner } from './_comun'
import type { ClaveCifrada } from '@/domain/tipos'

const publica = ({ id, sitio, usuario, cifrado, iv }: ClaveCifrada) => ({ id, sitio, usuario, cifrado, iv })

export async function GET() {
  const no = await soloOwner()
  if (no) return no
  const claves = await getRepo().claves.list()
  return json(claves.map(publica))
}

export async function POST(req: NextRequest) {
  const no = await soloOwner()
  if (no) return no
  const r = validarClave(await req.json().catch(() => null))
  if (!r.ok) return json({ error: r.error }, 400)
  const creada = await getRepo().claves.create(r.valor)
  return json(publica(creada))
}

export async function DELETE(req: NextRequest) {
  const no = await soloOwner()
  if (no) return no
  const id = req.nextUrl.searchParams.get('id')
  if (!id || id.length > 100) return json({ error: 'Falta cuál borrar.' }, 400)
  await getRepo().claves.remove(id)
  return json({ ok: true })
}
