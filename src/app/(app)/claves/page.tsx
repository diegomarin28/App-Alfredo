import { redirect } from 'next/navigation'
import { getSesion } from '@/auth/session'
import Claves from './Claves'

export const dynamic = 'force-dynamic'

/** Sin datos desde el servidor: todo se pide y se descifra en el celular, después de Face ID. */
export default async function PaginaClaves() {
  if ((await getSesion())?.rol !== 'owner') redirect('/')
  return <Claves />
}
