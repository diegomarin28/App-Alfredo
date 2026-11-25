import { EmptyState, IconoTile, Lista, Seccion, clasesFila } from '@/components/ui'
import { CamposServicio } from '@/components/campos'
import { TocarParaEditar } from '@/components/Editar'
import { iconoServicio } from '@/domain/iconoServicio'
import type { Casa, ServicioCasa } from '@/domain/tipos'
import BotonBorrar from '@/components/Borrar'
import Agregar from './Agregar'
import Copiar from './Copiar'
import { agregarServicio, borrarServicio, editarServicioCasa } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

export default function SeccionServicios({ casa, servicios }: { casa: Casa; servicios: ServicioCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarServicio({ casa, clave: s(f, 'clave'), valor: s(f, 'valor') })
  }
  return (
    <Seccion id="servicios" titulo="Servicios" accion={
      <Agregar boton="Agregar servicio" titulo="Nuevo servicio" guardar={guardar}>
        <CamposServicio />
      </Agregar>
    }>
      {servicios.length === 0 ? <EmptyState>Todavía no hay servicios cargados.</EmptyState> : (
        <Lista>
          {servicios.map((v) => (
            <li key={v.id} data-fila className={clasesFila}>
              <TocarParaEditar
                etiqueta={`Editar ${v.clave}`} titulo="Editar servicio" guardar={editarServicioCasa.bind(null, v.id)}
                campos={<CamposServicio clave={v.clave} valor={v.valor} enfocarDato={!v.valor} />}
                className="flex items-center gap-3"
              >
                <IconoTile nombre={iconoServicio(v.clave)} tono="gris" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold break-words text-texto">{v.clave}</span>
                  {v.valor
                    ? <span className="block text-base break-words text-texto-2">{v.valor}</span>
                    : <span className="block text-base font-semibold text-azul">Falta el número</span>}
                </span>
              </TocarParaEditar>
              {v.valor && <Copiar nombre={v.clave} texto={v.valor} />}
              <BotonBorrar nombre={v.clave} accion={borrarServicio.bind(null, v.id)} />
            </li>
          ))}
        </Lista>
      )}
    </Seccion>
  )
}
