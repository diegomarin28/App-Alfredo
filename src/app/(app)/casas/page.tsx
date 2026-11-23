import Link from 'next/link'
import { getRepo } from '@/data/getRepo'
import { casaDeParam, nombreCasa } from '@/domain/casas'
import type { Casa } from '@/domain/tipos'
import SeccionPersonas from './SeccionPersonas'
import SeccionHistorial from './SeccionHistorial'
import SeccionServicios from './SeccionServicios'

export const dynamic = 'force-dynamic'

const CASAS: Casa[] = ['portofino', 'malibu']

export default async function Page({ searchParams }: { searchParams: Promise<{ casa?: string | string[] }> }) {
  const casa = casaDeParam((await searchParams).casa)
  const repo = await getRepo()
  const [personas, eventos, servicios] = await Promise.all([
    repo.personasCasa.list({ casa }),
    repo.eventosCasa.list({ casa }),
    repo.serviciosCasa.list({ casa }),
  ])
  return (
    <main className="space-y-6">
      <h1 className="text-[28px] leading-tight font-semibold text-texto">{nombreCasa(casa)}</h1>
      <nav aria-label="Elegir casa" className="grid grid-cols-2 gap-2">
        {CASAS.map((c) => (
          <Link
            key={c}
            href={`/casas?casa=${c}`}
            aria-current={c === casa ? 'page' : undefined}
            className={`flex min-h-12 items-center justify-center rounded-xl text-base font-semibold ${c === casa ? 'bg-azul text-white' : 'bg-gris text-texto'}`}
          >
            {nombreCasa(c)}
          </Link>
        ))}
      </nav>
      <SeccionPersonas casa={casa} personas={personas} />
      <SeccionHistorial casa={casa} eventos={eventos} />
      <SeccionServicios casa={casa} servicios={servicios} />
    </main>
  )
}
