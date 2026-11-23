import { Card, EmptyState, Field, clasesInput } from '@/components/ui'
import type { Casa, ServicioCasa } from '@/domain/tipos'
import Borrar from '@/components/Borrar'
import Agregar from './Agregar'
import { agregarServicio, borrarServicio } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

export default function SeccionServicios({ casa, servicios }: { casa: Casa; servicios: ServicioCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarServicio({ casa, clave: s(f, 'clave'), valor: s(f, 'valor') })
  }
  return (
    <section aria-label="Servicios" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-texto">Servicios</h2>
        <Agregar boton="Agregar servicio" titulo="Agregar servicio" guardar={guardar}>
          <Field label="Servicio" hint="Por ejemplo DirecTV"><input name="clave" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Dato" hint="Por ejemplo Cliente 123456"><input name="valor" maxLength={500} className={clasesInput} autoComplete="off" /></Field>
        </Agregar>
      </div>
      {servicios.length === 0 ? <EmptyState>Todavía no hay servicios cargados.</EmptyState> : (
        <ul className="space-y-2">
          {servicios.map((v) => (
            <li key={v.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold break-words text-texto">{v.clave}</p>
                  <p className="text-base break-words text-texto-2">{v.valor}</p>
                </div>
                <Borrar pregunta={`¿Borrar ${v.clave}?`} accion={borrarServicio.bind(null, v.id)} className="shrink-0" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
