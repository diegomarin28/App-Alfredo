import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion()
  if (!sesion) redirect('/entrar')
  return (
    <>
      <div className="mx-auto min-h-dvh max-w-xl px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav rol={sesion.rol} />
    </>
  )
}
