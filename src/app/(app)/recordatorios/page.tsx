import { getRepo } from '@/data/getRepo'
import { hoy, recordatoriosActivos } from '@/domain/fechas'
import { chipAviso, ordenarAnuales } from '@/domain/recordatorios'
import { MESES } from '@/domain/validarFecha'
import { rotuloDiasSemana, rotuloRepeticion } from '@/domain/repeticion'
import { EmptyState, Lista, Seccion, Titulo, Volver, clasesFila } from '@/components/ui'
import { Icono } from '@/components/iconos'
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
      <Volver />
      <Titulo accion={<FormRecordatorio etiqueta="Agregar recordatorio" hoy={hoyStr} />}>Recordatorios</Titulo>

      <Seccion id="ahora" titulo="Para gestionar ahora">
        {activos.length === 0 && <EmptyState>Nada para gestionar por ahora. Quedate tranquilo.</EmptyState>}
        <ListaActivos items={activos.map((r) => ({ id: r.id, titulo: r.titulo, fecha: diaLargo(r.proxima.slice(5)), dias: r.dias, posponerDias: r.posponerDias ?? 15 }))} />
      </Seccion>

      <Seccion id="anual" titulo="Todos los recordatorios">
        <Lista>
          {todos.map((r) => (
            <li key={r.id} data-fila className={clasesFila}>
              {/* ronda 6: tocar la fila abre la edición */}
              <FormRecordatorio
                inicial={{ id: r.id, titulo: r.titulo, dia: r.dia, avisarDiasAntes: r.avisarDiasAntes, repeticion: r.repeticion, anio: r.anio, posponerDias: r.posponerDias, diasSemana: r.diasSemana }}
                etiqueta={`Editar ${r.titulo}`} hoy={hoyStr} className="flex items-center gap-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-texto">{r.titulo}</span>
                  <span className="block text-base text-texto-2">
                    {(r.repeticion === 'semanal' && r.diasSemana?.length
                      ? [`cada semana: ${rotuloDiasSemana(r.diasSemana)}`, 'aviso ese día']
                      : [
                        (r.repeticion ?? 'anual') === 'nunca' && r.dia && r.anio ? `${diaCorto(r.dia)} ${r.anio}` : diaCorto(r.dia),
                        (r.repeticion ?? 'anual') !== 'anual' ? rotuloRepeticion(r.repeticion ?? 'anual') : '',
                        r.repeticion === 'semanal' ? 'aviso ese día' : `aviso ${chipAviso(r.avisarDiasAntes)}`,
                      ]).filter(Boolean).join(' · ')}
                  </span>
                </span>
                <Icono nombre="lapiz" tamano={18} className="text-texto-2" />
              </FormRecordatorio>
            </li>
          ))}
        </Lista>
      </Seccion>
    </main>
  )
}
