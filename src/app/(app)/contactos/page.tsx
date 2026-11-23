import { getRepo } from '@/data/getRepo'
import NuevoContacto from './NuevoContacto'
import Contactos from './Contactos'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const todos = (await (await getRepo()).contactos.list()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Contactos</h1>
        <NuevoContacto />
      </header>
      <Contactos contactos={todos} />
    </main>
  )
}
