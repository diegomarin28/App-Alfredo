import { getRepo } from '@/data/getRepo'
import { ultimosGuardados } from '@/domain/ultimos'
import { hoy } from '@/domain/fechas'
import Contame from './Contame'

export const dynamic = 'force-dynamic'

export default async function Page() {
  return <Contame ultimos={await ultimosGuardados(getRepo())} hoy={hoy()} />
}
