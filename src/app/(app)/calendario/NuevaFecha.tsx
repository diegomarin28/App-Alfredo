'use client'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, CampoSelect, Field, Sheet, clasesFechaHora, clasesInput, clasesSelect } from '@/components/ui'
import { CampoDias, Segmentado } from '@/components/controles'
import { DiaMes, diaMesDe } from '@/components/campos'
import { REPETICIONES, diaDeSemana, diasMarcados } from '@/domain/repeticion'
import type { Fecha, Repeticion } from '@/domain/tipos'
import { agregarFecha, editarFecha } from './actions'

const TIPOS = [['cumple', 'Cumpleaños'], ['otra', 'Otra']] as const
type Tipo = (typeof TIPOS)[number][0]

export { DiaMes, clasesElegir } from '@/components/campos'

/** Lo que hace falta para editar una fecha. */
export type InicialFecha = Pick<Fecha, 'id' | 'nombre' | 'tipo' | 'dia' | 'anioNacimiento' | 'repeticion' | 'anioEvento' | 'hora' | 'diasSemana'>

/**
 * hoy (YYYY-MM-DD): "Todas las semanas" viene con el día de hoy marcado.
 * Con `inicial` (ronda 6) es la hoja de editar: se abre tocando la fila (`children`), con los datos cargados.
 */
export default function NuevaFecha({ hoy, inicial, etiqueta, children, className = '' }: {
  hoy: string; inicial?: InicialFecha; etiqueta?: string; children?: ReactNode; className?: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const tipoInicial: Tipo = inicial?.tipo ?? 'cumple'
  const repInicial: Repeticion = inicial?.tipo === 'otra' ? inicial.repeticion ?? 'anual' : 'anual'
  const diasIniciales = () => (inicial && repInicial === 'semanal' ? diasMarcados(inicial, hoy) : [diaDeSemana(hoy)])
  const [tipo, setTipo] = useState<Tipo>(tipoInicial)
  const [repeticion, setRepeticion] = useState<Repeticion>(repInicial)
  const [dias, setDias] = useState<number[]>(diasIniciales)
  const semanal = tipo === 'otra' && repeticion === 'semanal'
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  function abrir() {
    setError('')
    setTipo(tipoInicial)
    setRepeticion(repInicial)
    setDias(diasIniciales())
    setAbierto(true)
  }

  // semanal con días: la fecha guardada es solo desde cuándo; no se muestra
  const conDias = Boolean(inicial?.diasSemana?.length)
  const dm = conDias ? {} : diaMesDe(inicial?.dia)
  const anioIni = inicial ? (inicial.tipo === 'cumple' ? inicial.anioNacimiento : conDias ? undefined : inicial.anioEvento) : undefined
  const horaIni = inicial?.hora?.slice(0, 5) ?? ''

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const anio = String(f.get('anio') ?? '').trim()
    setEnviando(true)
    setError('')
    try {
      const entrada = {
        nombre: String(f.get('nombre') ?? ''), tipo,
        dia: Number(f.get('dia') || NaN), mes: Number(f.get('mes') || NaN), anio: anio ? Number(anio) : null,
        ...(tipo === 'otra' ? { repeticion, hora: String(f.get('hora') ?? ''), ...(semanal ? { diasSemana: dias } : {}) } : {}),
      }
      const r = inicial ? await editarFecha(inicial.id, entrada) : await agregarFecha(entrada)
      if (!r.ok) { setError(r.error); return }
      setAbierto(false)
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {inicial
        ? <button type="button" aria-label={etiqueta ?? `Editar ${inicial.nombre}`} data-editar onClick={abrir} className={`min-w-0 flex-1 text-left ${className}`}>{children}</button>
        : <BotonMas nombre="Agregar fecha" onClick={abrir} />}
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={inicial ? 'Editar fecha' : 'Nueva fecha'}>
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Nombre"><input name="nombre" defaultValue={inicial?.nombre ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div>
            <span className="mb-1.5 block text-base font-semibold text-texto">Tipo</span>
            <Segmentado etiqueta="Tipo" opciones={TIPOS} valor={tipo} onCambio={setTipo} />
          </div>
          {tipo === 'cumple' ? (
            <>
              <p className="text-base text-texto-2">Se repite todos los años.</p>
              <DiaMes {...dm} />
              <Field label="Año de nacimiento (opcional)">
                <input name="anio" defaultValue={inicial?.tipo === 'cumple' ? anioIni ?? '' : ''} inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
              </Field>
            </>
          ) : (
            <>
              <CampoSelect id="nueva-fecha-repite" label="Se repite">
                {(p) => (
                  <select {...p} value={repeticion} onChange={(e) => setRepeticion(e.target.value as Repeticion)} className={clasesSelect}>
                    {REPETICIONES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                )}
              </CampoSelect>
              {semanal ? (
                <>
                  <CampoDias dias={dias} setDias={setDias} />
                  <Field label="Hora (opcional)">
                    <input name="hora" type="time" defaultValue={horaIni} className={clasesFechaHora} />
                  </Field>
                </>
              ) : (
                <>
                  <DiaMes {...dm} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={repeticion === 'nunca' ? 'Año' : 'Año (desde)'}>
                      <input name="anio" defaultValue={inicial?.tipo === 'otra' ? anioIni ?? '' : ''} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder={repeticion === 'nunca' ? '' : 'Opcional'} className={clasesInput} />
                    </Field>
                    <Field label="Hora (opcional)">
                      <input name="hora" type="time" defaultValue={horaIni} className={clasesFechaHora} />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
