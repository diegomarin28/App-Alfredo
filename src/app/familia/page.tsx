import { redirect } from 'next/navigation'
import { codigoFamiliaValido } from '@/auth/codigos'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ codigo?: string | string[] }> }

/** Link para la familia: /familia?codigo=… . Si sirve, la ruta de auth abre la sesión. */
export default async function Familia({ searchParams }: Props) {
  const { codigo } = await searchParams
  if (typeof codigo === 'string' && codigoFamiliaValido(codigo, new Date())) {
    redirect(`/api/auth/familia?codigo=${encodeURIComponent(codigo)}`)
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">Este link ya no sirve</h1>
      <p className="text-texto-2">Pedile un link nuevo a quien te lo mandó.</p>
    </main>
  )
}
