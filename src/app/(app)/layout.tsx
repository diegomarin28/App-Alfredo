import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { familiaVence } from '@/auth/access'
import { getRepo } from '@/data/getRepo'
import BottomNav from '@/components/BottomNav'
import { ProveedorDeshacer } from '@/components/Borrar'
import { Icono } from '@/components/iconos'
import TransicionesPantalla from '@/components/TransicionesPantalla'

/** "miércoles 25" en hora de Montevideo. */
function diaDeVencimiento(iso: string | undefined): string {
  const d = iso ? new Date(iso) : familiaVence()
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-UY', { timeZone: 'America/Montevideo', weekday: 'long', day: 'numeric' }).format(d)
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion()
  if (!sesion) redirect('/entrar')
  const familia = sesion.rol === 'familia'
  // La primera vez que entra Alfredo: Bienvenida y Guía (una sola vez).
  if (!familia && !(await getRepo().getConfig()).bienvenidaVista) redirect('/bienvenida')
  return (
    <ProveedorDeshacer>
      {familia && (
        <p role="note" className="flex items-center gap-2 bg-urg-bg px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-base font-semibold text-urg-tx lg:pl-64">
          <Icono nombre="reloj" tamano={18} />
          Modo carga · el link vence el {diaDeVencimiento(sesion.expira)}
        </p>
      )}
      {/* lg: la navegación pasa a una barra lateral de 15rem (w-60); el contenido se centra en el resto */}
      <div className="lg:pl-60">
        <div className={`mx-auto min-h-dvh max-w-xl px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:max-w-[720px] lg:pb-[calc(2rem+env(safe-area-inset-bottom))] ${familia ? 'pt-5' : 'pt-[calc(2.5rem+env(safe-area-inset-top))]'}`}>
          {children}
        </div>
      </div>
      <BottomNav rol={sesion.rol} />
      <TransicionesPantalla />
    </ProveedorDeshacer>
  )
}
