import { Avatar, BotonIcono, EmptyState, Field, Lista, Seccion, clasesFila, clasesInput } from '@/components/ui'
import { telLink } from '@/domain/telefono'
import type { Casa, PersonaCasa } from '@/domain/tipos'
import BotonBorrar from '@/components/Borrar'
import Agregar from './Agregar'
import { agregarPersona, borrarPersona } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

export default function SeccionPersonas({ casa, personas }: { casa: Casa; personas: PersonaCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarPersona({ casa, nombre: s(f, 'nombre'), rol: s(f, 'rol'), detalle: s(f, 'detalle'), telefono: s(f, 'telefono') })
  }
  return (
    <Seccion id="ocupa" titulo="Quién se ocupa" accion={
      <Agregar boton="Agregar persona" titulo="Nueva persona" guardar={guardar}>
        <Field label="Nombre"><input name="nombre" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
        <Field label="Rol" hint="Por ejemplo Limpieza o Jardín"><input name="rol" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
        <Field label="Detalle" hint="Por ejemplo los jueves"><input name="detalle" maxLength={500} className={clasesInput} autoComplete="off" /></Field>
        <Field label="Teléfono" hint="Por ejemplo 099 123 456"><input name="telefono" type="tel" inputMode="tel" className={clasesInput} autoComplete="off" /></Field>
      </Agregar>
    }>
      {personas.length === 0 ? <EmptyState>Todavía no hay nadie cargado.</EmptyState> : (
        <Lista>
          {personas.map((p) => (
            <li key={p.id} data-fila className={clasesFila}>
              <Avatar nombre={p.nombre} tono="verde" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-texto">{p.nombre}</p>
                {/* en una sola línea: lo que no entra se corta con "…" */}
                <p className="truncate text-base text-texto-2">{[p.rol, p.detalle].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="-mr-2 flex shrink-0 items-center">
                {p.telefono && <BotonIcono nombre="Llamar" icono="telefono" tono="nada" href={telLink(p.telefono)} />}
                <BotonBorrar nombre={p.nombre} accion={borrarPersona.bind(null, p.id)} />
              </div>
            </li>
          ))}
        </Lista>
      )}
    </Seccion>
  )
}
