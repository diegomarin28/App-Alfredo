import { getRepo } from '@/data/getRepo'
import { Titulo } from '@/components/ui'
import NuevoContacto from './NuevoContacto'
import Contactos from './Contactos'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const repo = getRepo()
  const [contactos, grupos] = await Promise.all([repo.contactos.list(), repo.gruposContacto.list()])
  const todos = contactos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const ordenados = grupos.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')).map((g) => ({ id: g.id, nombre: g.nombre }))
  return (
    <main className="space-y-4">
      <Titulo accion={<NuevoContacto grupos={ordenados} />}>Contactos</Titulo>
      <Contactos contactos={todos} grupos={ordenados} />
    </main>
  )
}
