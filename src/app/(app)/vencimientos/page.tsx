import { getRepo } from '@/data/getRepo'
import { hoy, vencimientosProximos } from '@/domain/fechas'
import { chipVencimiento } from '@/domain/vencimientos'
import { MESES } from '@/domain/validarFecha'
import { Seccion, Titulo, Volver } from '@/components/ui'
import { Swing } from '@/components/detalles'
import FormVencimiento from './FormVencimiento'
import Lista from './Lista'

export const dynamic = 'force-dynamic'

/** "2026-11-20" -> "20 nov 2026". */
function fechaCorta(f: string): string {
  const [a, m, d] = f.split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()} ${a}`
}

export default async function Vencimientos() {
  const todos = vencimientosProximos(await getRepo().vencimientos.list(), hoy())
  const seccion = (id: string, titulo: string, ambito: 'empresa' | 'personal') => {
    const items = todos.filter((v) => v.ambito === ambito).map((v) => ({
      id: v.id, titulo: v.titulo, fecha: fechaCorta(v.fecha), chip: chipVencimiento(v.dias),
      tono: v.dias < 0 ? 'rojo' as const : v.urgente ? 'naranja' as const : 'gris' as const,
    }))
    // Siempre montada (el mismo árbol): así el "Deshacer" sobrevive aunque la sección quede vacía; vacía, sin título.
    return (
      <Seccion id={id} titulo={titulo} sinTitulo={items.length === 0}>
        <Lista items={items} />
      </Seccion>
    )
  }

  return (
    <main className="space-y-5">
      <Volver />
      <Titulo accion={<FormVencimiento />}>Vencimientos</Titulo>
      {/* golf (mockup v2): sin nada por vencer, un swing */}
      {todos.length === 0 && <Swing />}
      {seccion('empresa', 'Empresa', 'empresa')}
      {seccion('personales', 'Personales', 'personal')}
    </main>
  )
}
