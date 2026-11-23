import { Card, EmptyState, Field, clasesInput } from '@/components/ui'
import { fechaCompleta } from '@/domain/vencimientos'
import { hoy } from '@/domain/fechas'
import type { Casa, EventoCasa } from '@/domain/tipos'
import Borrar from '@/components/Borrar'
import Agregar from './Agregar'
import { agregarEvento, borrarEvento } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')
const corto = (t: string) => (t.length > 40 ? `${t.slice(0, 40).trimEnd()}…` : t)

export default function SeccionHistorial({ casa, eventos }: { casa: Casa; eventos: EventoCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarEvento({ casa, que: s(f, 'que'), cuando: s(f, 'cuando') })
  }
  return (
    <section aria-label="Historial" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-texto">Historial</h2>
        <Agregar boton="Agregar al historial" titulo="Agregar al historial" guardar={guardar}>
          <Field label="¿Qué pasó?"><textarea name="que" maxLength={2000} rows={4} className={`${clasesInput} py-2`} /></Field>
          <Field label="Fecha"><input name="cuando" type="date" defaultValue={hoy()} className={clasesInput} /></Field>
        </Agregar>
      </div>
      {eventos.length === 0 ? <EmptyState>Todavía no hay nada en el historial.</EmptyState> : (
        <ul className="space-y-2">
          {eventos.map((e) => (
            <li key={e.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold break-words text-texto">{e.que}</p>
                  <p className="text-base text-texto-2">{fechaCompleta(e.cuando)}</p>
                </div>
                <Borrar pregunta={`¿Borrar «${corto(e.que)}» del historial?`} accion={borrarEvento.bind(null, e.id)} className="shrink-0" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
