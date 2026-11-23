import { getRepo } from '@/data/getRepo'
import { hoy, recordatoriosActivos } from '@/domain/fechas'
import { chipAviso, fechaLarga, ordenarAnuales } from '@/domain/recordatorios'
import { Card, EmptyState } from '@/components/ui'
import ListaActivos from './Activo'
import FormRecordatorio from './FormRecordatorio'

export const dynamic = 'force-dynamic'

export default async function Recordatorios() {
  const hoyStr = hoy()
  const todos = ordenarAnuales(await (await getRepo()).recordatorios.list(), hoyStr)
  const activos = recordatoriosActivos(todos, hoyStr).sort((a, b) => a.dias - b.dias)

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold text-texto">Recordatorios</h1>
        <FormRecordatorio etiqueta="Agregar recordatorio" />
      </header>

      <section aria-labelledby="ahora" className="space-y-3">
        <h2 id="ahora" className="text-xl font-semibold">Para gestionar ahora</h2>
        {activos.length === 0 && <EmptyState>Nada para gestionar por ahora. Quedate tranquilo.</EmptyState>}
        <ListaActivos items={activos.map((r) => ({ id: r.id, titulo: r.titulo, fecha: fechaLarga(r.dia), dias: r.dias }))} />
      </section>

      <section aria-labelledby="anual" className="space-y-3">
        <h2 id="anual" className="text-xl font-semibold">Se repiten todos los años</h2>
        <ul className="space-y-2">
          {todos.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">{r.titulo}</p>
                  <p className="text-base text-texto-2">{fechaLarga(r.dia)}</p>
                  <span className="mt-1 inline-block rounded-full bg-gris px-3 py-1 text-base">{chipAviso(r.avisarDiasAntes)}</span>
                </div>
                <FormRecordatorio inicial={{ id: r.id, titulo: r.titulo, dia: r.dia, avisarDiasAntes: r.avisarDiasAntes }} etiqueta="Editar" soloIcono />
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
