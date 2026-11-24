import Link from 'next/link'
import { getRepo } from '@/data/getRepo'
import { edadQueCumple, hoy, proximosCumples, recordatoriosActivos } from '@/domain/fechas'
import { proximaDeFecha, rotuloRepeticion } from '@/domain/repeticion'
import { MESES } from '@/domain/validarFecha'
import { EmptyState, IconoTile, Seccion, Titulo } from '@/components/ui'
import BotonBorrar from '@/components/Borrar'
import { Icono } from '@/components/iconos'
import Saludo from './Saludo'
import { borrarFecha } from './actions'
import NuevaFecha from './NuevaFecha'

export const dynamic = 'force-dynamic'

const TIPO = { cumple: 'Cumpleaños', otra: 'Otra fecha' } as const

/** "Mañana, miércoles 25" / "En 3 días, viernes 27" / "Hoy, miércoles 25". */
function cuando(dias: number, proxima: string): string {
  const [y, m, d] = proxima.split('-').map(Number)
  const dia = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'long' }).format(new Date(Date.UTC(y, m - 1, d, 12)))
  const rel = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`
  return `${rel}, ${dia} ${d}`
}

const abreviar = (m: number) => MESES[m - 1].slice(0, 3).toLowerCase()

/** "Enero"; con el año solo si falta más de un año (una fecha de una sola vez, lejana). */
function tituloMes(clave: string, hoyStr: string): string {
  const [a, m] = clave.split('-').map(Number)
  const [ha, hm] = hoyStr.split('-').map(Number)
  const lejos = a > ha + 1 || (a === ha + 1 && m >= hm)
  return lejos ? `${MESES[m - 1]} ${a}` : MESES[m - 1]
}

export default async function Calendario() {
  const hoyStr = hoy()
  const repo = getRepo()
  const [fechas, recordatorios, config] = await Promise.all([repo.fechas.list(), repo.recordatorios.list(), repo.getConfig()])
  const proximo = proximosCumples(fechas.filter((f) => f.tipo === 'cumple'), hoyStr)[0]
  const activos = recordatoriosActivos(recordatorios, hoyStr).length
  // Cada fecha en su próxima vez (las que se repiten muestran la próxima; las de una vez que ya pasaron, no).
  const todas = fechas
    .map((f) => ({ ...f, proxima: proximaDeFecha(f, hoyStr), edad: f.tipo === 'cumple' ? edadQueCumple(f, hoyStr) : null }))
    .filter((f): f is typeof f & { proxima: string } => f.proxima !== null)
    .sort((a, b) => a.proxima.localeCompare(b.proxima) || (a.hora ?? '').localeCompare(b.hora ?? '') || a.nombre.localeCompare(b.nombre))
  const grupos = new Map<string, typeof todas>()
  for (const f of todas) {
    const clave = f.proxima.slice(0, 7)
    grupos.set(clave, [...(grupos.get(clave) ?? []), f])
  }
  const ordenados = [...grupos.entries()].map(([clave, items]) => [Number(clave.slice(5, 7)), items, clave] as const)

  return (
    <main className="space-y-4">
      <Titulo accion={<NuevaFecha />}>Calendario</Titulo>

      {proximo && (
        <section aria-label="Próximo cumpleaños" className="rounded-[20px] bg-azul p-4 text-white">
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icono nombre="torta" tamano={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[20px] leading-tight font-bold">
                {proximo.dias === 0
                  ? `Hoy cumple ${proximo.nombre}`
                  : proximo.edad != null ? `${proximo.nombre} cumple ${proximo.edad}` : `Cumple de ${proximo.nombre}`}
              </p>
              <p className="text-base text-tinte">{cuando(proximo.dias, proximo.proxima)}</p>
            </div>
          </div>
          {/* El saludo se manda solo el día del cumple. */}
          {proximo.dias === 0 && (
            <Saludo key={proximo.id} nombre={proximo.nombre.trim().split(/\s+/)[0]} firma={config.nombre || 'Alfredo'} />
          )}
        </section>
      )}

      <Link href="/recordatorios" className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-borde bg-white px-4">
        <IconoTile nombre="campana" tono="naranja" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-texto">Recordatorios</span>
          <span className={`block text-base ${activos ? 'text-urg-tx' : 'text-texto-2'}`}>
            {activos === 0 ? 'Nada para gestionar ahora' : `${activos} para gestionar ahora`}
          </span>
        </span>
        <Icono nombre="flecha" tamano={18} className="text-texto-2" />
      </Link>

      {ordenados.length === 0 && <EmptyState>Todavía no hay fechas cargadas. Tocá el + para sumar la primera.</EmptyState>}
      {ordenados.map(([m, items, clave]) => (
        <Seccion key={clave} id={`mes-${clave}`} titulo={tituloMes(clave, hoyStr)}>
          <ul className="space-y-2.5">
            {items.map((f) => (
              <li key={f.id} data-fila className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-borde bg-white py-2 pr-1.5 pl-3">
                <span className="flex w-12 shrink-0 flex-col items-center leading-none">
                  <span className="text-[26px] font-bold text-azul">{Number(f.proxima.slice(8))}</span>
                  <span className="mt-0.5 text-base font-semibold text-texto-2">{abreviar(m)}</span>
                </span>
                <span aria-hidden="true" className="h-9 w-px shrink-0 bg-borde" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-texto">{f.nombre}</span>
                  <span className="block text-base text-texto-2">
                    {[
                      TIPO[f.tipo],
                      f.edad != null ? `${f.edad} años` : '',
                      f.tipo === 'otra' && (f.repeticion ?? 'anual') !== 'anual' ? rotuloRepeticion(f.repeticion ?? 'anual') : '',
                      f.hora ? `${f.hora.slice(0, 5)} h` : '',
                    ].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <BotonBorrar nombre={f.nombre} accion={borrarFecha.bind(null, f.id)} />
              </li>
            ))}
          </ul>
        </Seccion>
      ))}
    </main>
  )
}
