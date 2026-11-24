import Link from 'next/link'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { fotoDelDia } from '@/domain/fotoDelDia'
import { saludoDelMomento } from '@/domain/detalles'
import Actualizar from '@/components/Actualizar'
import { hoy, proximosCumples, vencimientosProximos } from '@/domain/fechas'
import { EmptyState, IconoTile, Lista, clasesFila, clasesSeparador } from '@/components/ui'
import { Icono, type NombreIcono } from '@/components/iconos'

export const dynamic = 'force-dynamic'

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

/** Accesos de Inicio (mockup v2): 2 columnas, ícono + texto, 52 px de alto. */
const ACCESOS: [string, string, NombreIcono][] = [
  ['Vencimientos', '/vencimientos', 'reloj'],
  ['Tareas pendientes', '/pendientes', 'tilde'],
  ['Recordatorios', '/recordatorios', 'campana'],
  ['Contactos', '/contactos', 'personas'],
  ['Documentos', '/documentos', 'carpeta'],
  ['Contraseñas', '/claves', 'candado'],
  ['Fotos', '/fotos', 'imagen'],
]

const clasesTitulo = 'text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto'

/** Fila de "Lo próximo": ícono, qué, cuándo y flecha. */
function Proximo({ href, icono, tono, titulo, detalle, urgente = false }: {
  href: string; icono: NombreIcono; tono: 'azul' | 'naranja' | 'gris'; titulo: string; detalle: string; urgente?: boolean
}) {
  return (
    <li className={clasesSeparador}>
      <Link href={href} className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5">
        <IconoTile nombre={icono} tono={tono} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-texto">{titulo}</span>
          <span className={`block text-base ${urgente ? 'text-urg-tx' : 'text-texto-2'}`}>{detalle}</span>
        </span>
        <Icono nombre="flecha" tamano={18} className="text-texto-2" />
      </Link>
    </li>
  )
}

export default async function Inicio() {
  const repo = getRepo()
  const hoyStr = hoy()
  const sesionP = getSesion()
  // Todo en paralelo (cada consulta a Supabase es un viaje): lo del owner sale apenas se conoce la sesión.
  const [sesion, config, fotos, fechas, delOwner, recordatorios] = await Promise.all([
    sesionP,
    repo.getConfig(),
    repo.fotos.list(),
    repo.fechas.list(),
    sesionP.then((s) => (s?.rol === 'owner' ? Promise.all([repo.vencimientos.list(), repo.pendientes.list()]) : null)),
    sesionP.then((s) => (s?.rol === 'familia' ? repo.recordatorios.list() : null)),
  ])
  const owner = sesion?.rol === 'owner'

  // Modo familia (mockup v2): pantalla de carga, con lo que ya hay de cada cosa.
  if (!owner) {
    const tarjetas: [string, string, string, NombreIcono][] = [
      ['Cumpleaños y fechas', `${fechas.length} ${fechas.length === 1 ? 'cargada' : 'cargadas'}`, '/calendario', 'torta'],
      ['Fotos de la familia', `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`, '/fotos', 'imagen'],
      ['Portofino y Malibú', 'Personas y servicios', '/casas', 'casa'],
      ['Recordatorios', `${recordatorios?.length ?? 0} ${recordatorios?.length === 1 ? 'cargado' : 'cargados'}`, '/recordatorios', 'campana'],
    ]
    return (
      <Actualizar>
      <main className="space-y-4">
        <div className="space-y-1.5">
          <h1 className={clasesTitulo}>Cargando datos para {config.nombre || 'Alfredo'}</h1>
          <p className="text-base text-texto-2">Gracias por ayudar. {config.nombre || 'Alfredo'} no ve esta pantalla: solo lo que cargues.</p>
        </div>
        <nav aria-label="Qué cargar" className="space-y-3">
          {tarjetas.map(([titulo, detalle, href, icono]) => (
            <Link key={href} href={href} className="flex min-h-[88px] items-center gap-3.5 rounded-2xl border border-borde bg-white px-4">
              <IconoTile nombre={icono} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-texto">{titulo}</span>
                <span className="block text-base text-texto-2">{detalle}</span>
              </span>
              <Icono nombre="flecha" tamano={18} className="text-texto-2" />
            </Link>
          ))}
        </nav>
      </main>
      </Actualizar>
    )
  }

  const foto = fotoDelDia(fotos, hoyStr)
  const fotoUrl = foto ? await repo.urlArchivo(foto.path) : null
  const cumple = proximosCumples(fechas.filter((f) => f.tipo === 'cumple'), hoyStr)[0]
  const venc = delOwner ? vencimientosProximos(delOwner[0], hoyStr)[0] : undefined
  const abiertos = delOwner ? delOwner[1].filter((p) => !p.hecho).length : 0

  return (
    <Actualizar>
    <main className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-base text-texto-2">{fechaLarga(hoyStr)}</p>
          <h1 className={clasesTitulo}>{saludoDelMomento(new Date())}, {config.nombre || 'Alfredo'}</h1>
        </div>
        <Link href="/ajustes" aria-label="Ajustes" className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto-2 hover:bg-tinte">
          <Icono nombre="tuerca" tamano={24} />
        </Link>
      </header>

      <section aria-label="Foto del día">
        {fotoUrl ? (
          <div className="relative overflow-hidden rounded-[20px]">
            <Link href="/fotos" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- R21: archivos de /api/archivos con <img> plano */}
              <img
                src={fotoUrl} alt="Foto familiar del día" className="aspect-[16/9] w-full object-cover"
                style={{ objectPosition: `${(foto?.focoX ?? 0.5) * 100}% ${(foto?.focoY ?? 0.5) * 100}%` }}
              />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent px-4 pt-10 pb-3 text-white">
                <span className="text-base font-semibold">Foto del día</span>
                <span className="rounded-full bg-black/35 px-3 py-0.5 text-base font-semibold backdrop-blur">Ver todas</span>
              </span>
            </Link>
            <Link href="/fotos" aria-label="Agregar fotos" className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
              <Icono nombre="imagen" tamano={20} />
            </Link>
          </div>
        ) : (
          <EmptyState href="/fotos" accion="Agregar fotos">Todavía no hay fotos de la familia. Sumá algunas y van a aparecer acá, una por día.</EmptyState>
        )}
      </section>

      <nav aria-label="Accesos directos" className="grid grid-cols-2 gap-2.5">
        {ACCESOS.map(([nombre, href, icono], i) => (
          <Link
            key={href} href={href}
            className={`flex min-h-[52px] items-center gap-2.5 rounded-2xl border border-borde bg-white px-3 py-2 text-base leading-tight font-semibold text-texto hover:bg-tinte-claro ${ACCESOS.length % 2 === 1 && i === ACCESOS.length - 1 ? 'col-span-2' : ''}`}
          >
            <IconoTile nombre={icono} tamano={32} /><span className="min-w-0 [overflow-wrap:anywhere]">{nombre}</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="proximo" className="space-y-2.5">
        <h2 id="proximo" className="text-[17px] font-bold">Lo próximo</h2>
        <Lista>
          {cumple
            ? <Proximo href="/calendario" icono="torta" tono="azul" titulo={`Cumple de ${cumple.nombre}`} detalle={[enDias(cumple.dias), cumple.edad ? `cumple ${cumple.edad}` : ''].filter(Boolean).join(' · ')} />
            : <li className={`${clasesFila} text-base text-texto-2`}>No hay cumpleaños cargados.</li>}
          {venc
            ? <Proximo href="/vencimientos" icono="reloj" tono={venc.urgente ? 'naranja' : 'gris'} titulo={venc.titulo} detalle={venc.dias < 0 ? enDias(venc.dias) : `Vence ${enDias(venc.dias).toLowerCase()}`} urgente={venc.urgente} />
            : <li className={`${clasesFila} text-base text-texto-2`}>No hay vencimientos pendientes.</li>}
          {abiertos > 0
            ? <Proximo href="/pendientes" icono="tilde" tono="gris" titulo={`${abiertos} ${abiertos === 1 ? 'tarea pendiente' : 'tareas pendientes'}`} detalle="Para hacer" />
            : <li className={`${clasesFila} text-base text-texto-2`}>No hay tareas pendientes.</li>}
        </Lista>
      </section>
    </main>
    </Actualizar>
  )
}
