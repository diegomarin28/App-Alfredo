import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import Guia from './Guia'

export const dynamic = 'force-dynamic'

export default async function Pagina() {
  const sesion = await getSesion()
  if (!sesion) redirect('/entrar')
  if (sesion.rol !== 'owner') redirect('/')
  return <Guia />
}
