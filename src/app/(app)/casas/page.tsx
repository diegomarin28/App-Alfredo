import Link from 'next/link'
import { getRepo } from '@/data/getRepo'
import { casaDeParam, nombreCasa } from '@/domain/casas'
import { Titulo } from '@/components/ui'
import type { Casa } from '@/domain/tipos'
import SeccionPersonas from './SeccionPersonas'
import SeccionHistorial from './SeccionHistorial'
import SeccionServicios from './SeccionServicios'

export const dynamic = 'force-dynamic'

const CASAS: Casa[] = ['portofino', 'malibu']

export default async function Page({ searchParams }: { searchParams: Promise<{ casa?: string | string[] }> }) {
  const casa = casaDeParam((await searchParams).casa)
  const repo = getRepo()
  const [personas, eventos, servicios] = await Promise.all([
    repo.personasCasa.list({ casa }),
    repo.eventosCasa.list({ casa }),
    repo.serviciosCasa.list({ casa }),
  ])
  return (
    <main className="space-y-5">
      <Titulo>Casas</Titulo>
      {/* selector segmentado del mockup: la casa elegida en blanco sobre la bandeja gris */}
      <nav aria-label="Elegir casa" className="grid grid-cols-2 gap-1 rounded-[14px] bg-gris p-1">
        {CASAS.map((c) => (
          <Link
            key={c}
            href={`/casas?casa=${c}`}
            aria-current={c === casa ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center rounded-[10px] text-base font-semibold ${c === casa ? 'bg-white text-azul shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-texto-2'}`}
          >
            {nombreCasa(c)}
          </Link>
        ))}
      </nav>
      <SeccionPersonas casa={casa} personas={personas} />
      <SeccionServicios casa={casa} servicios={servicios} />
      <SeccionHistorial casa={casa} eventos={eventos} />
    </main>
  )
}
