import Link from 'next/link'
import { soloOwner } from './guardia'
import { getRepo } from '@/data/getRepo'
import { EmptyState, Field, clasesInput } from '@/components/ui'
import Agregar from '../casas/Agregar'
import { nuevaCarpeta } from './actions'

export const dynamic = 'force-dynamic'

export default async function Page() {
  await soloOwner()
  const carpetas = await getRepo().carpetas.list()
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold text-texto">Documentos</h1>
        <Agregar boton="Nueva carpeta" titulo="Nueva carpeta" guardar={nuevaCarpeta}>
          <Field label="Nombre"><input name="nombre" maxLength={40} className={clasesInput} autoComplete="off" /></Field>
        </Agregar>
      </div>
      {carpetas.length === 0 ? <EmptyState>Todavía no hay carpetas.</EmptyState> : (
        <ul className="grid grid-cols-2 gap-3">
          {carpetas.map((c) => (
            <li key={c.id}>
              <Link href={`/documentos/${c.id}`} className="flex min-h-24 items-center justify-center rounded-2xl border border-borde bg-white p-4 text-center text-lg font-semibold text-texto">
                {c.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
