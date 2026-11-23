import Link from 'next/link'
import { registroPermitido } from '@/auth/access'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { FormConfigurar } from './FormConfigurar'

export const dynamic = 'force-dynamic'

export default async function Configurar() {
  const [passkeys, sesion] = await Promise.all([getRepo().passkeys.list(), getSesion()])
  if (!registroPermitido(passkeys.length, sesion)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Face ID ya está configurado</h1>
          <p className="text-texto-2">Para entrar, usá Face ID.</p>
        </div>
        <Link href="/entrar" className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-azul px-6 text-lg font-semibold text-white hover:bg-azul-osc">
          Ir a entrar
        </Link>
      </main>
    )
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Configurar Face ID</h1>
        <p className="text-texto-2">Escribí el código de configuración y después confirmá con Face ID.</p>
      </div>
      <FormConfigurar />
    </main>
  )
}
