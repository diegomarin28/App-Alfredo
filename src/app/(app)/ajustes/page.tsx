import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { Titulo, Volver } from '@/components/ui'
import Avisos from './Avisos'
import Perfil from './Perfil'
import Salir, { VerGuia } from './Salir'

export const dynamic = 'force-dynamic'

export default async function Ajustes() {
  const [sesion, config] = await Promise.all([getSesion(), getRepo().getConfig()])
  if (sesion?.rol !== 'owner') redirect('/')
  return (
    <main className="space-y-4">
      <Volver />
      <Titulo>Ajustes</Titulo>
      <section aria-label="Tu perfil">
        <Perfil nombre={config.nombre} estilo={config.estiloEscritura} />
      </section>
      <Avisos vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      <VerGuia />
      <section aria-label="Sesión">
        <Salir />
      </section>
    </main>
  )
}
