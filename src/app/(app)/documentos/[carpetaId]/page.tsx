import { notFound } from 'next/navigation'
import { getRepo } from '@/data/getRepo'
import { EmptyState } from '@/components/ui'
import { fechaCompleta } from '@/domain/vencimientos'
import { hoyMontevideo } from '@/domain/fechas'
import Subir from '../../Subir'
import { soloOwner } from '../guardia'
import Galeria from './Galeria'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ carpetaId: string }> }) {
  await soloOwner()
  const { carpetaId } = await params
  const repo = getRepo()
  const carpeta = await repo.carpetas.get(carpetaId)
  if (!carpeta) notFound()
  const docs = await repo.documentos.list({ carpetaId })
  const items = await Promise.all(docs.map(async (d) => ({
    id: d.id, titulo: d.titulo, url: await repo.urlArchivo(d.path), fecha: fechaCompleta(hoyMontevideo(new Date(d.creadoEn))),
  })))
  return (
    <main className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">{carpeta.nombre}</h1>
      <Subir tipo="documento" carpetaId={carpeta.id} />
      {items.length === 0 ? <EmptyState>Todavía no hay documentos en esta carpeta.</EmptyState> : <Galeria items={items} />}
    </main>
  )
}
