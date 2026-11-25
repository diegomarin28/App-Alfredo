import { EmptyState, Lista, Seccion, clasesFila } from '@/components/ui'
import { CamposEvento } from '@/components/campos'
import { TocarParaEditar } from '@/components/Editar'
import { fechaCompleta } from '@/domain/vencimientos'
import { hoy } from '@/domain/fechas'
import type { Casa, EventoCasa } from '@/domain/tipos'
import BotonBorrar from '@/components/Borrar'
import Agregar from './Agregar'
import { agregarEvento, borrarEvento, editarEvento } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')
const corto = (t: string) => (t.length > 40 ? `${t.slice(0, 40).trimEnd()}…` : t)

export default function SeccionHistorial({ casa, eventos }: { casa: Casa; eventos: EventoCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarEvento({ casa, que: s(f, 'que'), cuando: s(f, 'cuando') })
  }
  return (
    <Seccion id="historial" titulo="Historial" accion={
      <Agregar boton="Agregar al historial" titulo="Agregar al historial" guardar={guardar}>
        <CamposEvento cuando={hoy()} />
      </Agregar>
    }>
      {eventos.length === 0 ? <EmptyState>Todavía no hay nada en el historial.</EmptyState> : (
        <Lista>
          {eventos.map((e) => (
            <li key={e.id} data-fila className={clasesFila}>
              <TocarParaEditar
                etiqueta={`Editar ${corto(e.que)}`} titulo="Editar historial" guardar={editarEvento.bind(null, e.id)}
                campos={<CamposEvento que={e.que} cuando={e.cuando} />}
              >
                <span className="block text-base font-semibold break-words text-texto">{e.que}</span>
                <span className="block text-base text-texto-2">{fechaCompleta(e.cuando)}</span>
              </TocarParaEditar>
              <BotonBorrar nombre={corto(e.que)} accion={borrarEvento.bind(null, e.id)} />
            </li>
          ))}
        </Lista>
      )}
    </Seccion>
  )
}
