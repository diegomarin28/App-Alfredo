import { getRepo } from '@/data/getRepo'
import { EmptyState } from '@/components/ui'
import Borrar from '@/components/Borrar'
import Subir from '../Subir'
import { borrarFoto } from './actions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const repo = getRepo()
  const fotos = await repo.fotos.list()
  const items = await Promise.all(fotos.map(async (f) => ({ id: f.id, url: await repo.urlArchivo(f.path) })))
  return (
    <main className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Fotos de la familia</h1>
      <Subir tipo="foto" />
      {items.length === 0 ? <EmptyState>Todavía no hay fotos. Sumá la primera.</EmptyState> : (
        <ul className="grid grid-cols-2 gap-3">
          {items.map((f) => (
            <li key={f.id} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="Foto familiar" className="aspect-square w-full rounded-2xl border border-borde object-cover" />
              <Borrar pregunta="¿Borrar esta foto?" accion={borrarFoto.bind(null, f.id)} className="w-full" />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
