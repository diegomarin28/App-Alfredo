import { getRepo } from '@/data/getRepo'
import { fechaCorta } from '@/domain/vencimientos'
import { hoy } from '@/domain/fechas'
import { EmptyState, Seccion, Titulo, Volver } from '@/components/ui'
import { Icono } from '@/components/iconos'
import NuevaNota from './NuevaNota'
import Pendientes, { NuevoPendiente } from './Pendientes'

export const dynamic = 'force-dynamic'

export default async function PendientesYNotas() {
  const repo = getRepo()
  const [pendientes, todasLasNotas, config] = await Promise.all([repo.pendientes.list(), repo.notas.list(), repo.getConfig()])
  const notas = todasLasNotas.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

  return (
    <main className="space-y-5">
      <Volver />
      <Titulo accion={<NuevoPendiente />}>Tareas pendientes</Titulo>
      {/* los que creó Contame (vienen de un dictado) llevan el micrófono */}
      <Pendientes items={pendientes.map((p) => ({ id: p.id, texto: p.texto, hecho: p.hecho, deVoz: Boolean(p.loteId) }))} nombre={config.nombre || 'Alfredo'} hoy={hoy()} />
      <Seccion id="notas" titulo="Notas" accion={<NuevaNota />}>
        {notas.length === 0 && <EmptyState>Todavía no hay notas.</EmptyState>}
        <ul className="space-y-2.5">
          {notas.map((n) => (
            <li key={n.id} data-fila className="space-y-1 rounded-2xl border border-borde bg-white px-4 py-3">
              <p className="flex items-center gap-1.5 text-base text-texto-2">
                {n.origen === 'voz' && <><Icono nombre="microfono" tamano={16} />Nota de voz ·</>}
                {n.origen === 'voz' ? ` ${fechaCorta(n.creadoEn)}` : fechaCorta(n.creadoEn)}
              </p>
              <p className="text-base whitespace-pre-wrap text-texto">{n.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>
    </main>
  )
}
