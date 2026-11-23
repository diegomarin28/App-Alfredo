import { getRepo } from '@/data/getRepo'
import { hoy, vencimientosProximos } from '@/domain/fechas'
import { chipVencimiento, fechaCompleta } from '@/domain/vencimientos'
import { EmptyState } from '@/components/ui'
import FormVencimiento from './FormVencimiento'
import Lista from './Lista'

export const dynamic = 'force-dynamic'

export default async function Vencimientos() {
  const todos = vencimientosProximos(await (await getRepo()).vencimientos.list(), hoy())
  const seccion = (id: string, titulo: string, ambito: 'empresa' | 'personal') => {
    const items = todos.filter((v) => v.ambito === ambito).map((v) => ({
      id: v.id, titulo: v.titulo, fecha: fechaCompleta(v.fecha), chip: chipVencimiento(v.dias), urgente: v.urgente,
    }))
    return (
      <section aria-labelledby={id} className="space-y-3">
        <h2 id={id} className="text-xl font-semibold">{titulo}</h2>
        {/* Siempre montada: así el "Deshacer" sobrevive aunque la sección quede vacía. */}
        <Lista items={items} />
      </section>
    )
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold text-texto">Vencimientos</h1>
        <FormVencimiento />
      </header>
      {todos.length === 0 && <EmptyState>No hay vencimientos pendientes. Agregá el primero con el botón de arriba.</EmptyState>}
      {seccion('empresa', 'Empresa', 'empresa')}
      {seccion('personales', 'Personales', 'personal')}
    </main>
  )
}
