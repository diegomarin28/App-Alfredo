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

const icono = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-azul">{d}</svg>
)
const ACCESOS = [
  ['Vencimientos', '/vencimientos', icono(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)],
  ['Pendientes', '/pendientes', icono(<path d="M4 12l5 5L20 6" />)],
  ['Documentos', '/documentos', icono(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />)],
  ['Contraseñas', '/claves', icono(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>)],
  ['Contactos', '/contactos', icono(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2" /></>)],
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
          <p className="mb-1 text-base text-texto-2">{fechaLarga(hoyStr)}</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">{saludo(new Date())}, {config.nombre || 'Alfredo'}</h1>
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
          <div className="space-y-3">
            <Link href="/fotos" className="block rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- R21: archivos de /api/archivos con <img> plano */}
              <img src={fotoUrl} alt="Foto familiar del día" className="aspect-[4/3] w-full rounded-2xl border border-borde object-cover" />
            </Link>
            <Link href="/fotos" className="inline-flex min-h-11 items-center rounded-xl px-1 text-base font-semibold text-azul hover:underline">
              Agregar fotos
            </Link>
          </div>
        ) : (
          <EmptyState href="/fotos" accion="Agregar fotos">Todavía no hay fotos de la familia. Sumá algunas y van a aparecer acá, una por día.</EmptyState>
        )}
      </section>

      {owner && (
        <nav aria-label="Accesos directos" className="grid grid-cols-2 gap-3">
          {/* con un número impar de accesos, el último ocupa las dos columnas */}
          {ACCESOS.map(([nombre, href, svg]) => (
            <Link key={href} href={href} className="flex min-h-14 items-center gap-2.5 rounded-[14px] border border-borde bg-white px-3.5 text-base font-semibold text-texto last:odd:col-span-2 hover:bg-tinte">
              {svg}{nombre}
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="proximo" className="space-y-3">
        <h2 id="proximo" className="text-lg font-bold">Lo próximo</h2>
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
