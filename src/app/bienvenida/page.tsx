import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { Icono } from '@/components/iconos'

export const dynamic = 'force-dynamic'

/** Papelitos de colores (decorativos). */
const PAPELITOS = [
  ['8%', '11%', 'h-4 w-2 rotate-[20deg] bg-amarillo'], ['47%', '8%', 'size-2.5 rounded-full bg-white'],
  ['82%', '14%', 'h-4 w-2 -rotate-[35deg] bg-white'], ['63%', '21%', 'h-3 w-1.5 -rotate-[30deg] bg-amarillo'],
  ['24%', '24%', 'h-3 w-1.5 rotate-[40deg] bg-tinte'], ['74%', '30%', 'size-2.5 rounded-sm bg-amarillo'],
  ['86%', '43%', 'h-3 w-1.5 rotate-[30deg] bg-tinte'],
] as const

/** Primera vez (mockup v2): el saludo de cumpleaños de Pau y Diego, y después la Guía. */
export default async function Bienvenida() {
  const sesion = await getSesion()
  if (!sesion) redirect('/entrar')
  if (sesion.rol !== 'owner') redirect('/')
  const { nombre } = await getRepo().getConfig()
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-azul to-azul-osc px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] text-white">
      {PAPELITOS.map(([x, y, c]) => <span key={x + y} aria-hidden="true" style={{ left: x, top: y }} className={`absolute ${c}`} />)}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5">
        <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-[20px] bg-white/15">
          <Icono nombre="torta" tamano={36} />
        </span>
        <h1 className="text-[40px] leading-[1.05] font-bold tracking-[-0.8px]">¡Feliz cumpleaños, {nombre || 'Alfredo'}!</h1>
        <p className="text-[17px] leading-relaxed text-white/90">
          Esta app es tu regalo. La hicimos para que tengas todo en un solo lugar: fechas, casas, documentos, y alguien
          que te ayude a escribir y a acordarte.
        </p>
        <p className="text-[17px] font-bold">Con cariño, Pau y Diego</p>
      </div>
      <Link href="/guia" className="mx-auto flex min-h-14 w-full max-w-md items-center justify-center rounded-2xl bg-white text-lg font-semibold text-azul">
        Ver qué puede hacer
      </Link>
    </main>
  )
}
