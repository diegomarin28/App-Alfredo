import { getRepo } from '@/data/getRepo'
import { hoy, recordatoriosActivos } from '@/domain/fechas'
import { chipAviso, ordenarAnuales } from '@/domain/recordatorios'
import { MESES } from '@/domain/validarFecha'
import { EmptyState, Lista, Seccion, Titulo, clasesFila } from '@/components/ui'
import ListaActivos from './Activo'
import FormRecordatorio from './FormRecordatorio'

export const dynamic = 'force-dynamic'

/** "12-24" -> "24 dic"; sin fecha -> "fecha a cargar". */
function diaCorto(dia: string | null): string {
  if (dia === null) return 'fecha a cargar'
  const [m, d] = dia.split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`
}

/** "12-25" -> "25 de diciembre". */
function diaLargo(dia: string | null): string {
  if (dia === null) return 'Fecha a cargar'
  const [m, d] = dia.split('-').map(Number)
  return `${d} de ${MESES[m - 1].toLowerCase()}`
}

export default async function Recordatorios() {
  const hoyStr = hoy()
  const todos = ordenarAnuales(await getRepo().recordatorios.list(), hoyStr)
  const activos = recordatoriosActivos(todos, hoyStr).sort((a, b) => a.dias - b.dias)

  return (
    <main className="space-y-5">
      <Titulo accion={<FormRecordatorio etiqueta="Agregar recordatorio" />}>Recordatorios</Titulo>

      <Seccion id="ahora" titulo="Para gestionar ahora">
        {activos.length === 0 && <EmptyState>Nada para gestionar por ahora. Quedate tranquilo.</EmptyState>}
        <ListaActivos items={activos.map((r) => ({ id: r.id, titulo: r.titulo, fecha: diaLargo(r.dia), dias: r.dias }))} />
      </Seccion>

      <Seccion id="anual" titulo="Todos los años">
        <Lista>
          {todos.map((r) => (
            <li key={r.id} data-fila className={clasesFila}>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-texto">{r.titulo}</span>
                <span className="block text-base text-texto-2">{diaCorto(r.dia)} · aviso {chipAviso(r.avisarDiasAntes)}</span>
              </span>
              <FormRecordatorio inicial={{ id: r.id, titulo: r.titulo, dia: r.dia, avisarDiasAntes: r.avisarDiasAntes }} etiqueta={`Editar ${r.titulo}`} soloIcono />
            </li>
          ))}
        </Lista>
      </Seccion>
    </main>
  )
}
