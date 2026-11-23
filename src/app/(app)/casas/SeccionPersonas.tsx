import { Card, EmptyState, Field, clasesInput } from '@/components/ui'
import { formatearTelUY } from '@/domain/contactos'
import { telLink } from '@/domain/telefono'
import type { Casa, PersonaCasa } from '@/domain/tipos'
import Agregar from './Agregar'
import { agregarPersona } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

export default function SeccionPersonas({ casa, personas }: { casa: Casa; personas: PersonaCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarPersona({ casa, nombre: s(f, 'nombre'), rol: s(f, 'rol'), detalle: s(f, 'detalle'), telefono: s(f, 'telefono') })
  }
  return (
    <section aria-label="Quién se ocupa" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-texto">Quién se ocupa</h2>
        <Agregar boton="Agregar persona" titulo="Agregar persona" guardar={guardar}>
          <Field label="Nombre"><input name="nombre" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Rol" hint="Por ejemplo Limpieza o Jardín"><input name="rol" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Detalle"><input name="detalle" maxLength={500} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Teléfono" hint="Por ejemplo 099 123 456"><input name="telefono" type="tel" inputMode="tel" className={clasesInput} autoComplete="off" /></Field>
        </Agregar>
      </div>
      {personas.length === 0 ? <EmptyState>Todavía no hay nadie cargado.</EmptyState> : (
        <ul className="space-y-2">
          {personas.map((p) => (
            <li key={p.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-texto">{p.nombre}</p>
                  <p className="text-base text-texto-2">{p.rol}</p>
                  {p.detalle && <p className="text-base text-texto-2">{p.detalle}</p>}
                  {p.telefono && <p className="text-base text-texto-2">{formatearTelUY(p.telefono)}</p>}
                </div>
                {p.telefono && (
                  <a href={telLink(p.telefono)} className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-azul px-5 text-base font-semibold text-white hover:bg-azul-osc">Llamar</a>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
