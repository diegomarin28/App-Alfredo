import { NextResponse } from 'next/server'
import { autorizado, manejarCron } from '@/avisos/cron'
import { getPush } from '@/avisos/push'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  let push
  try {
    push = getPush()
  } catch (e) {
    console.error('[avisos] push no configurado', e)
    return NextResponse.json({ error: 'Push no configurado.' }, { status: 500 })
  }
  return manejarCron(req, { repo: getRepo(), push, hoy: hoy() })
}
