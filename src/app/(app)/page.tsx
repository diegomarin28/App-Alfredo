import Link from 'next/link'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { fotoDelDia } from '@/domain/fotoDelDia'
import { hoy, proximosCumples, vencimientosProximos } from '@/domain/fechas'
import { Card, EmptyState } from '@/components/ui'

export const dynamic = 'force-dynamic'

const TZ = 'America/Montevideo'

function saludo(ahora: Date): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(ahora))
  if (h >= 5 && h < 12) return 'Buen día'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaLarga(hoyStr: string): string {
  const [y, m, d] = hoyStr.split('-').map(Number)
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...o }).format(new Date(Date.UTC(y, m - 1, d, 12)))
  const t = `${f({ weekday: 'long' })} ${d} de ${f({ month: 'long' })}`
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function enDias(n: number): string {
  if (n < 0) return n === -1 ? 'Venció ayer' : `Venció hace ${-n} días`
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}

const ACCESOS = [
  ['Vencimientos', '/vencimientos'], ['Pendientes', '/pendientes'], ['Documentos', '/documentos'],
  ['Contraseñas', '/claves'], ['Contactos', '/contactos'],
] as const

export default async function Inicio() {
  const sesion = await getSesion()
  const owner = sesion?.rol === 'owner'
  const repo = await getRepo()
  const hoyStr = hoy()
  const [config, fotos, fechas] = await Promise.all([repo.getConfig(), repo.fotos.list(), repo.fechas.list()])
  const foto = fotoDelDia(fotos, hoyStr)
  const fotoUrl = foto ? await repo.urlArchivo(foto.path) : null
  const cumple = proximosCumples(fechas.filter((f) => f.tipo === 'cumple'), hoyStr)[0]
  const venc = owner ? vencimientosProximos(await repo.vencimientos.list(), hoyStr)[0] : undefined
  const abiertos = owner ? (await repo.pendientes.list()).filter((p) => !p.hecho).length : 0

  return (
    <main className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold text-texto">{saludo(new Date())}, {config.nombre || 'Alfredo'}</h1>
          <p className="mt-1 text-base text-texto-2">{fechaLarga(hoyStr)}</p>
        </div>
        {owner && (
          <Link href="/ajustes" aria-label="Ajustes" className="flex size-11 shrink-0 items-center justify-center rounded-full text-texto-2 hover:bg-tinte">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        )}
      </header>

      <section aria-label="Foto del día">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- R21: archivos de /api/archivos con <img> plano
          <img src={fotoUrl} alt="Foto familiar del día" className="aspect-[4/3] w-full rounded-2xl border border-borde object-cover" />
        ) : (
          <EmptyState href="/fotos" accion="Agregar fotos">Todavía no hay fotos de la familia. Sumá algunas y van a aparecer acá, una por día.</EmptyState>
        )}
      </section>

      {owner && (
        <nav aria-label="Accesos directos" className="grid grid-cols-2 gap-3">
          {ACCESOS.map(([nombre, href]) => (
            <Link key={href} href={href} className="flex min-h-14 items-center rounded-2xl border border-borde bg-white px-4 text-base font-medium text-texto hover:bg-tinte">
              {nombre}
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="proximo" className="space-y-3">
        <h2 id="proximo" className="text-xl font-semibold">Lo próximo</h2>
        <Card>
          {cumple ? (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium">Cumple de {cumple.nombre}</span>
              <span className="text-base text-texto-2">{enDias(cumple.dias)}</span>
            </div>
          ) : <p className="text-base text-texto-2">No hay cumpleaños cargados.</p>}
        </Card>
        {owner && (
          <>
            <Card className={venc?.urgente ? 'border-transparent bg-urg-bg text-urg-tx' : ''}>
              {venc ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium">{venc.titulo}</span>
                  <span className="text-base">{enDias(venc.dias)}</span>
                </div>
              ) : <p className="text-base text-texto-2">No hay vencimientos pendientes.</p>}
            </Card>
            <Card>
              {abiertos > 0
                ? <p className="text-base font-medium">{abiertos} {abiertos === 1 ? 'pendiente' : 'pendientes'}</p>
                : <p className="text-base text-texto-2">No hay pendientes.</p>}
            </Card>
          </>
        )}
      </section>
    </main>
  )
}
