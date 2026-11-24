import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { BotonEntrar } from './BotonEntrar'
import { NombreApp } from '@/components/Marca'

export const dynamic = 'force-dynamic'

export default async function Entrar() {
  if ((await getSesion())?.rol === 'owner') redirect('/')
  // Solo mientras no hay ninguna passkey: después /configurar ya no sirve sin sesión (I4).
  const primeraVez = (await getRepo().passkeys.list()).length === 0
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícono fijo de public/ */}
        <img src="/apple-touch-icon.png" alt="" width={72} height={72} className="size-[72px] rounded-[20px]" />
        <NombreApp className="text-[28px] text-texto" />
      </div>
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
