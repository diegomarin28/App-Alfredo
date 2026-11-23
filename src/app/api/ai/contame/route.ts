import { NextResponse, type NextRequest } from 'next/server'
import { getAi, getEmail, IaNoConfiguradaError } from '@/ai'
import { contame, MAX_RESPUESTA, MAX_RONDAS, MAX_TEXTO_CONTAME, type EntradaContame } from '@/ai/contame'
import { ConfigIaError, SinSaldoError } from '@/ai/presupuesto'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'

/** Segundos que Vercel deja correr la función (varias rondas con herramientas). En el plan Hobby el tope es menor: ver docs/deploy.md. */
export const maxDuration = 300

const mal = (error: string) => NextResponse.json({ error }, { status: 400 })

function validar(b: Record<string, unknown>): EntradaContame | { error: string } {
  if (typeof b.texto !== 'string' || !b.texto.trim()) return { error: 'Falta el texto.' }
  if (b.texto.length > MAX_TEXTO_CONTAME) return { error: `El texto es demasiado largo (máximo ${MAX_TEXTO_CONTAME} caracteres).` }
  if (b.respuestas === undefined) return { texto: b.texto }
  if (!Array.isArray(b.respuestas) || b.respuestas.length > MAX_RONDAS) return { error: 'Respuestas inválidas.' }
  if (!b.respuestas.every((r) => typeof r === 'string' && r.trim() && r.length <= MAX_RESPUESTA)) return { error: 'Respuestas inválidas.' }
  return { texto: b.texto, respuestas: b.respuestas as string[] }
}

export async function POST(req: NextRequest) {
  try {
    await requerirRol('owner') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || typeof b !== 'object') return mal('Pedido inválido.')
  const entrada = validar(b)
  if ('error' in entrada) return mal(entrada.error)
  try {
    return NextResponse.json(await contame(getRepo(), getAi(), getEmail(), entrada))
  } catch (e) {
    if (e instanceof SinSaldoError || e instanceof ConfigIaError || e instanceof IaNoConfiguradaError) {
      return NextResponse.json({ error: e.message })
    }
    console.error('[ia] contame', e)
    return NextResponse.json({ error: 'No pude guardarlo, probá de nuevo.' }, { status: 500 })
  }
}
