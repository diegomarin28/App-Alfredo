import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { BotonEntrar } from './BotonEntrar'

export const dynamic = 'force-dynamic'

export default async function Entrar() {
  if ((await getSesion())?.rol === 'owner') redirect('/')
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-texto">Hola, Alfredo</h1>
        <p className="text-texto-2">Para entrar, usá Face ID.</p>
      </div>
      <BotonEntrar />
    </main>
  )
}
