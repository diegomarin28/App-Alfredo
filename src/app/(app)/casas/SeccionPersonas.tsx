import { Avatar, BotonIcono, EmptyState, Lista, Seccion, clasesFila } from '@/components/ui'
import { CamposPersona } from '@/components/campos'
import { TocarParaEditar } from '@/components/Editar'
import { telLink } from '@/domain/telefono'
import type { Casa, PersonaCasa } from '@/domain/tipos'
import BotonBorrar from '@/components/Borrar'
import Agregar from './Agregar'
import { agregarPersona, borrarPersona, editarPersona } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

export default function SeccionPersonas({ casa, personas }: { casa: Casa; personas: PersonaCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarPersona({ casa, nombre: s(f, 'nombre'), rol: s(f, 'rol'), detalle: s(f, 'detalle'), telefono: s(f, 'telefono') })
  }
  return (
    <Seccion id="ocupa" titulo="Quién se ocupa" accion={
      <Agregar boton="Agregar persona" titulo="Nueva persona" guardar={guardar}>
        <CamposPersona />
      </Agregar>
    }>
      {personas.length === 0 ? <EmptyState>Todavía no hay nadie cargado.</EmptyState> : (
        <Lista>
          {personas.map((p) => (
            <li key={p.id} data-fila className={clasesFila}>
              {/* ronda 6: tocar la fila abre la edición; sin teléfono, la fila lo pide */}
              <TocarParaEditar
                etiqueta={`Editar ${p.nombre}`} titulo="Editar persona" guardar={editarPersona.bind(null, p.id)}
                campos={<CamposPersona nombre={p.nombre} rol={p.rol} detalle={p.detalle} telefono={p.telefono} enfocarTelefono={!p.telefono} />}
                className="flex items-center gap-3"
              >
                <Avatar nombre={p.nombre} tono="verde" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-texto">{p.nombre}</span>
                  {/* en una sola línea: lo que no entra se corta con "…" */}
                  <span className="block truncate text-base text-texto-2">{[p.rol, p.detalle].filter(Boolean).join(' · ')}</span>
                  {!p.telefono && <span className="block text-base font-semibold text-azul">Agregar teléfono</span>}
                </span>
              </TocarParaEditar>
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
