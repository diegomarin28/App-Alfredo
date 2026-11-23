import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { Repo } from '@/data/repo'
import { avisosDelDia } from './calcular'
import type { PushSender } from './push'

function igualesConstante(a: string, b: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(a), h(b))
}

/** R29: sin CRON_SECRET configurado, siempre 401 (falla cerrado). */
export function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  return igualesConstante(req.headers.get('authorization') ?? '', `Bearer ${secreto}`)
}

export async function manejarCron(req: Request, deps: { repo: Repo; push: PushSender; hoy: string }) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { repo, push, hoy } = deps
  const [fechas, recordatorios, vencimientos, subs] = await Promise.all([
    repo.fechas.list(), repo.recordatorios.list(), repo.vencimientos.list(), repo.suscripciones.list(),
  ])
  const avisos = avisosDelDia({ fechas, recordatorios, vencimientos }, hoy)
  let enviados = 0
  let borradas = 0
  for (const sub of subs) {
    for (const aviso of avisos) {
      try {
        await push.enviar(sub, aviso)
        enviados++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await repo.suscripciones.remove(sub.id)
          borradas++
          break
        }
        console.error('[avisos] no se pudo enviar', status ?? e)
      }
    }
  }
  return NextResponse.json({ avisos: avisos.length, enviados, borradas })
}
