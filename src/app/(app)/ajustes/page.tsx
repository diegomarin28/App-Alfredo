import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import Avisos from './Avisos'
import Perfil from './Perfil'
import Salir from './Salir'

export const dynamic = 'force-dynamic'

export default async function Ajustes() {
  const [sesion, config] = await Promise.all([getSesion(), getRepo().getConfig()])
  if (sesion?.rol !== 'owner') redirect('/')
  return (
    <main className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Ajustes</h1>
      <section aria-labelledby="perfil" className="space-y-3">
        <h2 id="perfil" className="text-xl font-semibold">Tu perfil</h2>
        <Perfil nombre={config.nombre} estilo={config.estiloEscritura} />
      </section>
      <section aria-labelledby="avisos" className="space-y-3">
        <h2 id="avisos" className="text-xl font-semibold">Avisos</h2>
        <Avisos vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      </section>
      <section aria-label="Sesión">
        <Salir />
      </section>
    </main>
  )
}
