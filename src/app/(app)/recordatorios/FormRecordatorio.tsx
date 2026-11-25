'use client'
import { useId, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonIcono, BotonMas, CampoSelect, Field, Sheet, clasesInput, clasesSelect } from '@/components/ui'
import { CampoDias } from '@/components/controles'
import AvisoChips, { claveAviso, diasAviso, otroDesdeDias } from '@/components/AvisoChips'
import type { UnidadAviso } from '@/domain/avisoDias'
import { MESES } from '@/domain/validarFecha'
import { REPETICIONES, diaDeSemana, diasMarcados } from '@/domain/repeticion'
import { OPCIONES_POSPONER } from '@/domain/posponer'
import type { Repeticion } from '@/domain/tipos'
import { guardarRecordatorio } from './actions'

function numeroONulo(v: FormDataEntryValue | null): number | null {
  return v === null || v === '' ? null : Number(v)
}

/** "Elegí" en gris hasta elegir. */
const clasesElegir = `${clasesSelect} invalid:text-texto-2`

export interface Inicial {
  id: string; titulo: string; dia: string | null; avisarDiasAntes: number
  repeticion?: Repeticion; anio?: number; posponerDias?: number; diasSemana?: number[]
}

/** hoy (YYYY-MM-DD): "Todas las semanas" viene con el día de hoy marcado. */
/** Con `children` (ronda 6), la fila entera es el botón que abre la edición. */
export default function FormRecordatorio({ inicial, etiqueta, soloIcono, hoy, children, className = '' }: {
  inicial?: Inicial; etiqueta: string; soloIcono?: boolean; hoy: string; children?: ReactNode; className?: string
}) {
  const router = useRouter()
  const idForm = useId()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  // los semanales avisan el mismo día (0): si deja de ser semanal, arranca en "1 mes"
  const claveInicial = inicial && inicial.avisarDiasAntes > 0 ? claveAviso(inicial.avisarDiasAntes) : 'mes'
  const otroInicial = inicial && claveInicial === 'otro' ? otroDesdeDias(inicial.avisarDiasAntes) : { otro: '', unidad: 'dias' as UnidadAviso }
  const [aviso, setAviso] = useState<string>(claveInicial)
  const [otro, setOtro] = useState(otroInicial.otro)
  const [unidad, setUnidad] = useState<UnidadAviso>(otroInicial.unidad)
  const [repeticion, setRepeticion] = useState<Repeticion>(inicial?.repeticion ?? 'anual')
  const diasIniciales = () => (inicial?.repeticion === 'semanal' ? diasMarcados(inicial, hoy) : [diaDeSemana(hoy)])
  const [dias, setDias] = useState<number[]>(diasIniciales)
  const semanal = repeticion === 'semanal'

  function abrir() {
    setError('')
    setAviso(claveInicial)
    setOtro(otroInicial.otro)
    setUnidad(otroInicial.unidad)
    setRepeticion(inicial?.repeticion ?? 'anual')
    setDias(diasIniciales())
    setAbierto(true)
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await guardarRecordatorio(inicial?.id ?? null, {
        titulo: String(f.get('titulo') ?? ''), dia: numeroONulo(f.get('dia')), mes: numeroONulo(f.get('mes')),
        avisarDiasAntes: diasAviso(aviso, otro, unidad), repeticion, anio: numeroONulo(f.get('anio')),
        posponerDias: Number(f.get('posponer') ?? 15), ...(semanal ? { diasSemana: dias } : {}),
      })
      if (!r.ok) { setError(r.error); return }
      setAbierto(false)
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // semanal con días: la fecha guardada es solo el inicio; no se muestra si pasa a otra repetición
  const conDias = Boolean(inicial?.diasSemana?.length)
  const mmdd = conDias ? null : inicial?.dia ?? null
  const diaIni = mmdd ? Number(mmdd.slice(3)) : ''
  const mesIni = mmdd ? Number(mmdd.slice(0, 2)) : ''

  return (
    <>
      {children
        ? <button type="button" aria-label={etiqueta} data-editar onClick={abrir} className={`min-w-0 flex-1 text-left ${className}`}>{children}</button>
        : soloIcono ? <BotonIcono nombre={etiqueta} icono="lapiz" tono="nada" onClick={abrir} /> : <BotonMas nombre={etiqueta} onClick={abrir} />}
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={inicial ? 'Editar recordatorio' : 'Agregar recordatorio'}>
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" defaultValue={inicial?.titulo ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <CampoSelect id={`${idForm}-repite`} label="Se repite">
            {(p) => (
              <select {...p} value={repeticion} onChange={(e) => setRepeticion(e.target.value as Repeticion)} className={clasesSelect}>
                {REPETICIONES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            )}
          </CampoSelect>
          {semanal ? (
            <>
              <CampoDias dias={dias} setDias={setDias} />
              <p className="text-base text-texto-2">Te aviso ese mismo día.</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Día">
                  <select name="dia" aria-label="Día" defaultValue={diaIni} required className={clasesElegir}>
                    <option value="">Elegí</option>
                    {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                  </select>
                </Field>
                <Field label="Mes">
                  <select name="mes" aria-label="Mes" defaultValue={mesIni} required className={clasesElegir}>
                    <option value="">Elegí</option>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label={repeticion === 'nunca' ? 'Año' : 'Año (opc.)'}>
                  <input name="anio" aria-label="Año" defaultValue={conDias ? '' : inicial?.anio ?? ''} inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
                </Field>
              </div>
              <AvisoChips aviso={aviso} setAviso={setAviso} otro={otro} setOtro={setOtro} unidad={unidad} setUnidad={setUnidad} />
            </>
          )}
          <CampoSelect id={`${idForm}-posponer`} label="Posponer, por defecto">
            {(p) => (
              <select {...p} name="posponer" defaultValue={inicial?.posponerDias ?? 15} className={clasesSelect}>
                {OPCIONES_POSPONER.map(([d, t]) => <option key={d} value={d}>{t}</option>)}
              </select>
            )}
          </CampoSelect>
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
