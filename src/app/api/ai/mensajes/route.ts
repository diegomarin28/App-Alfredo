import { NextResponse, type NextRequest } from 'next/server'
import { getAi, getEmail, IaNoConfiguradaError } from '@/ai'
import { generarMensaje, type EntradaMensaje } from '@/ai/mensajes'
import { ConfigIaError, SinSaldoError } from '@/ai/presupuesto'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'

const MAX = 4000
const mal = (error: string) => NextResponse.json({ error }, { status: 400 })

function texto(v: unknown, nombre: string, opcional = false): string | undefined | { error: string } {
  if (v === undefined && opcional) return undefined
  if (typeof v !== 'string' || !v.trim()) return { error: `Falta ${nombre}.` }
  if (v.length > MAX) return { error: `El campo ${nombre} es demasiado largo (máximo ${MAX} caracteres).` }
  return v
}

function validar(b: Record<string, unknown>): EntradaMensaje | { error: string } {
  if (b.modo !== 'responder' && b.modo !== 'escribir') return { error: 'Modo inválido.' }
  if (b.variante !== undefined && b.variante !== 'formal' && b.variante !== 'otra') return { error: 'Variante inválida.' }
  const anterior = texto(b.anterior, 'el mensaje anterior', true)
  if (typeof anterior === 'object') return anterior
  const comun = { variante: b.variante as 'formal' | 'otra' | undefined, anterior }
  if (b.modo === 'responder') {
    const mensaje = texto(b.mensaje, 'el mensaje')
    if (typeof mensaje !== 'string') return mensaje ?? { error: 'Falta el mensaje.' }
    return { modo: 'responder', mensaje, ...comun }
  }
  const destinatario = texto(b.destinatario, 'el destinatario')
  if (typeof destinatario !== 'string') return destinatario ?? { error: 'Falta el destinatario.' }
  const idea = texto(b.idea, 'la idea')
  if (typeof idea !== 'string') return idea ?? { error: 'Falta la idea.' }
  return { modo: 'escribir', destinatario, idea, ...comun }
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
    const texto = await generarMensaje(getRepo(), getAi(), getEmail(), entrada)
    return NextResponse.json({ texto })
  } catch (e) {
    if (e instanceof SinSaldoError || e instanceof ConfigIaError || e instanceof IaNoConfiguradaError) {
      return NextResponse.json({ error: e.message })
    }
    console.error('[ia] mensajes', e)
    return NextResponse.json({ error: 'No pude escribir el mensaje, probá de nuevo.' }, { status: 500 })
  }
}
