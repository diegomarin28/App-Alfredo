import { EmptyState, Field, IconoTile, Lista, Seccion, clasesFila, clasesInput } from '@/components/ui'
import type { NombreIcono } from '@/components/iconos'
import { normalizarBusqueda } from '@/domain/contactos'
import type { Casa, ServicioCasa } from '@/domain/tipos'
import BotonBorrar from '@/components/Borrar'
import Agregar from './Agregar'
import Copiar from './Copiar'
import { agregarServicio, borrarServicio } from './actions'

const s = (f: FormData, k: string) => String(f.get(k) ?? '')

/** Ícono del servicio según su nombre (luz, agua, tele); si no, una carpeta. */
function iconoDe(clave: string): NombreIcono {
  const n = normalizarBusqueda(clave)
  if (/ute|luz|electric/.test(n)) return 'rayo'
  if (/ose|agua/.test(n)) return 'gota'
  if (/directv|cable|tv|tele|antel|internet|wifi/.test(n)) return 'tele'
  if (/tel|celular|movil/.test(n)) return 'telefono'
  return 'carpeta'
}

export default function SeccionServicios({ casa, servicios }: { casa: Casa; servicios: ServicioCasa[] }) {
  async function guardar(f: FormData) {
    'use server'
    return agregarServicio({ casa, clave: s(f, 'clave'), valor: s(f, 'valor') })
  }
  return (
    <Seccion id="servicios" titulo="Servicios" accion={
      <Agregar boton="Agregar servicio" titulo="Nuevo servicio" guardar={guardar}>
        <Field label="Servicio" hint="Por ejemplo DirecTV"><input name="clave" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
        <Field label="Dato" hint="Por ejemplo Cliente 123456"><input name="valor" maxLength={500} className={clasesInput} autoComplete="off" /></Field>
      </Agregar>
    }>
      {servicios.length === 0 ? <EmptyState>Todavía no hay servicios cargados.</EmptyState> : (
        <Lista>
          {servicios.map((v) => (
            <li key={v.id} data-fila className={clasesFila}>
              <IconoTile nombre={iconoDe(v.clave)} tono="gris" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold break-words text-texto">{v.clave}</p>
                <p className="text-base break-words text-texto-2">{v.valor ?? 'Falta el número'}</p>
              </div>
              {v.valor && <Copiar nombre={v.clave} texto={v.valor} />}
              <BotonBorrar nombre={v.clave} accion={borrarServicio.bind(null, v.id)} />
            </li>
          ))}
        </Lista>
      )}
    </Seccion>
  )
}
