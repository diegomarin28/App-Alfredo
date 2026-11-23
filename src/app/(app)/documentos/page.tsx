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
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Documentos</h1>
        <Agregar boton="Nueva carpeta" titulo="Nueva carpeta" guardar={nuevaCarpeta}>
          <Field label="Nombre"><input name="nombre" maxLength={40} className={clasesInput} autoComplete="off" /></Field>
        </Agregar>
      </div>
      {carpetas.length === 0 ? <EmptyState>Todavía no hay carpetas.</EmptyState> : (
        <ul className="grid grid-cols-2 gap-2.5">
          {carpetas.map((c) => (
            <li key={c.id}>
              <Link href={`/documentos/${c.id}`} className="flex min-h-24 flex-col items-start gap-2.5 rounded-2xl border border-borde bg-white p-4 text-base font-semibold text-texto hover:bg-fondo">
                <span className="flex size-11 items-center justify-center rounded-xl bg-tinte text-azul">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                </span>
                <span className="break-words">{c.nombre}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
