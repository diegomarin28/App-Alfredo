import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { EmptyState, Titulo, Volver } from '@/components/ui'
import Fotos from './Fotos'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const repo = getRepo()
  // en el modo familia, Fotos es una pestaña del menú: sin "Volver"
  const pestana = (await getSesion())?.rol === 'familia'
  const items = await repo.fotos.list().then((fotos) => Promise.all(fotos.map(async (f) => ({ id: f.id, url: await repo.urlArchivo(f.path), focoX: f.focoX, focoY: f.focoY }))))
  return (
    <main className="space-y-4">
      {!pestana && <Volver />}
      <Titulo accion={<span className="text-base text-texto-2">{items.length} {items.length === 1 ? 'foto' : 'fotos'}</span>}>Fotos</Titulo>
      <Fotos items={items} />
      {items.length === 0 && <EmptyState>Todavía no hay fotos. Sumá la primera: van a aparecer en Inicio, una por día.</EmptyState>}
    </main>
  )
}
