import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import Avisos from './Avisos'

export const dynamic = 'force-dynamic'

export default async function Ajustes() {
  const sesion = await getSesion()
  if (sesion?.rol !== 'owner') redirect('/')
  return (
    <main className="space-y-5">
      <h1 className="text-[28px] leading-tight font-semibold text-texto">Ajustes</h1>
      <section aria-labelledby="avisos" className="space-y-3">
        <h2 id="avisos" className="text-xl font-semibold">Avisos</h2>
        <Avisos vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      </section>
    </main>
  )
}
