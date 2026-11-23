import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { linkFamilia, vigenciaLarga } from '@/domain/linkFamilia'
import Avisos from './Avisos'
import LinkFamilia from './LinkFamilia'
import Perfil from './Perfil'
import Salir from './Salir'

export const dynamic = 'force-dynamic'

export default async function Ajustes() {
  const sesion = await getSesion()
  if (sesion?.rol !== 'owner') redirect('/')
  const config = await (await getRepo()).getConfig()
  const url = linkFamilia(process.env.APP_ORIGIN ?? '', process.env.FAMILY_CODE)
  return (
    <main className="space-y-6">
      <h1 className="text-[28px] leading-tight font-semibold text-texto">Ajustes</h1>
      <section aria-labelledby="perfil" className="space-y-3">
        <h2 id="perfil" className="text-xl font-semibold">Tu perfil</h2>
        <Perfil nombre={config.nombre} estilo={config.estiloEscritura} />
      </section>
      <section aria-labelledby="avisos" className="space-y-3">
        <h2 id="avisos" className="text-xl font-semibold">Avisos</h2>
        <Avisos vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} />
      </section>
      <section aria-labelledby="familia" className="space-y-3">
        <h2 id="familia" className="text-xl font-semibold">Link para la familia</h2>
        {url
          ? <LinkFamilia url={url} vigencia={vigenciaLarga(process.env.FAMILY_EXPIRES_AT)} />
          : <p className="text-base text-texto-2">Falta configurar el código de familia.</p>}
      </section>
      <section aria-label="Sesión">
        <Salir />
      </section>
    </main>
  )
}
