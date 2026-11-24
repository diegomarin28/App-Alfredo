import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import BottomNav from '@/components/BottomNav'
import TransicionesPantalla from '@/components/TransicionesPantalla'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion()
  if (!sesion) redirect('/entrar')
  return (
    <>
      {/* lg: la navegación pasa a una barra lateral de 15rem (w-60); el contenido se centra en el resto */}
      <div className="lg:pl-60">
        <div className="mx-auto min-h-dvh max-w-xl px-5 pt-[calc(1.75rem+env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-[720px] lg:pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
      <BottomNav rol={sesion.rol} />
      <TransicionesPantalla />
    </>
  )
}
