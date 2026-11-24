import { notFound } from 'next/navigation'
import { getRepo } from '@/data/getRepo'
import { EmptyState, Titulo, Volver } from '@/components/ui'
import { hoyMontevideo } from '@/domain/fechas'
import { MESES } from '@/domain/validarFecha'
import { soloOwner } from '../guardia'
import Galeria from './Galeria'
import NuevoDocumento from './NuevoDocumento'

export const dynamic = 'force-dynamic'

/** Timestamp -> "24 nov" (día de Montevideo). */
function diaCorto(iso: string): string {
  const [, m, d] = hoyMontevideo(new Date(iso)).split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`
}

export default async function Page({ params }: { params: Promise<{ carpetaId: string }> }) {
  const [, { carpetaId }] = await Promise.all([soloOwner(), params])
  const repo = getRepo()
  const [carpeta, items] = await Promise.all([
    repo.carpetas.get(carpetaId),
    repo.documentos.list({ carpetaId }).then((docs) => Promise.all(docs.map(async (d) => ({
      id: d.id, titulo: d.titulo, url: await repo.urlArchivo(d.path), fecha: diaCorto(d.creadoEn),
    })))),
  ])
  if (!carpeta) notFound()
  return (
    <main className="space-y-3">
      <Volver href="/documentos">Documentos</Volver>
      <Titulo accion={<NuevoDocumento carpetaId={carpeta.id} />}>{carpeta.nombre}</Titulo>
      <p className="text-base text-texto-2">{items.length} {items.length === 1 ? 'documento' : 'documentos'}</p>
      {items.length === 0 ? <EmptyState>Todavía no hay documentos en esta carpeta. Tocá el + para sacarle una foto al primero.</EmptyState> : <Galeria items={items} />}
    </main>
  )
}
