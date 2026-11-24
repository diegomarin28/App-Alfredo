import Link from 'next/link'
import { soloOwner } from './guardia'
import { getRepo } from '@/data/getRepo'
import { EmptyState, Field, IconoTile, Titulo, clasesInput } from '@/components/ui'
import Agregar from '../casas/Agregar'
import { nuevaCarpeta } from './actions'

export const dynamic = 'force-dynamic'

/** Campos de "Nueva carpeta": nombre y, si quiere, qué va adentro. */
function Campos() {
  return (
    <>
      <Field label="Nombre"><input name="nombre" maxLength={40} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Qué va adentro (opcional)"><input name="descripcion" maxLength={60} className={clasesInput} autoComplete="off" placeholder="Por ejemplo: cédula, pasaporte" /></Field>
    </>
  )
}

export default async function Page() {
  await soloOwner()
  const carpetas = (await getRepo().carpetas.list()).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
  return (
    <main className="space-y-4">
      <Titulo accion={<Agregar forma="mas" boton="Nueva carpeta" titulo="Nueva carpeta" guardar={nuevaCarpeta}><Campos /></Agregar>}>Documentos</Titulo>
      {carpetas.length === 0 ? <EmptyState>Todavía no hay carpetas.</EmptyState> : (
        <ul className="grid grid-cols-2 gap-2.5">
          {carpetas.map((c) => (
            <li key={c.id}>
              <Link href={`/documentos/${c.id}`} className="flex min-h-[132px] flex-col items-start gap-2.5 rounded-2xl border border-borde bg-white p-3.5 hover:bg-tinte-claro">
                <IconoTile nombre="carpeta" />
                <span className="min-w-0">
                  <span className="block text-base font-bold break-words text-texto">{c.nombre}</span>
                  {c.descripcion && <span className="block text-base leading-snug text-texto-2">{c.descripcion}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
