import { Card, EmptyState, Field, clasesInput } from '@/components/ui'
import type { Casa, ServicioCasa } from '@/domain/tipos'
import Agregar from './Agregar'
import { agregarServicio } from './actions'

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
              <Card className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-base font-semibold text-texto">{v.clave}</span>
                <span className="text-base text-texto-2">{v.valor}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
