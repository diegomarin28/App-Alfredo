import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { BotonEntrar } from './BotonEntrar'

export const dynamic = 'force-dynamic'

export default async function Entrar() {
  if ((await getSesion())?.rol === 'owner') redirect('/')
  // Solo mientras no hay ninguna passkey: después /configurar ya no sirve sin sesión (I4).
  const primeraVez = (await getRepo().passkeys.list()).length === 0
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      {/* inicial provisoria: el logo de la app queda para más adelante */}
      <span aria-hidden="true" className="flex size-[72px] items-center justify-center rounded-[20px] bg-azul text-[34px] font-bold text-white">A</span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">Hola, Alfredo</h1>
        <p className="text-base text-texto-2">Para entrar, usá Face ID.</p>
      </div>
      <BotonEntrar />
      {primeraVez && (
        <Link href="/configurar" className="mx-auto inline-flex min-h-11 items-center px-2 text-base text-texto-2 underline underline-offset-4">
          Configurar Face ID por primera vez
        </Link>
      )}
    </main>
  )
}
