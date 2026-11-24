'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, CampoSelect, Field, Sheet, clasesInput, clasesSelect } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import { MESES } from '@/domain/validarFecha'
import { REPETICIONES } from '@/domain/repeticion'
import type { Repeticion } from '@/domain/tipos'
import { agregarFecha } from './actions'

const TIPOS = [['cumple', 'Cumpleaños'], ['otra', 'Otra']] as const
type Tipo = (typeof TIPOS)[number][0]

/** "Elegí" en gris hasta elegir (ronda 4b). */
export const clasesElegir = `${clasesSelect} invalid:text-texto-2`

/** Día y mes con "Elegí" (vacío hasta elegir). */
export function DiaMes() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Día">
        <select name="dia" aria-label="Día" defaultValue="" required className={clasesElegir}>
          <option value="" disabled>Elegí</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </Field>
      <Field label="Mes">
        <select name="mes" aria-label="Mes" defaultValue="" required className={clasesElegir}>
          <option value="" disabled>Elegí</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </Field>
    </div>
  )
}

export default function NuevaFecha() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('cumple')
  const [repeticion, setRepeticion] = useState<Repeticion>('anual')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const anio = String(f.get('anio') ?? '').trim()
    setEnviando(true)
    setError('')
    try {
      const r = await agregarFecha({
        nombre: String(f.get('nombre') ?? ''), tipo,
        dia: Number(f.get('dia') || NaN), mes: Number(f.get('mes') || NaN), anio: anio ? Number(anio) : null,
        ...(tipo === 'otra' ? { repeticion, hora: String(f.get('hora') ?? '') } : {}),
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

  return (
    <>
      <BotonMas nombre="Agregar fecha" onClick={() => { setError(''); setTipo('cumple'); setRepeticion('anual'); setAbierto(true) }} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nueva fecha">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Nombre"><input name="nombre" className={clasesInput} autoComplete="off" /></Field>
          <div>
            <span className="mb-1.5 block text-base font-semibold text-texto">Tipo</span>
            <Segmentado etiqueta="Tipo" opciones={TIPOS} valor={tipo} onCambio={setTipo} />
          </div>
          {tipo === 'cumple' ? (
            <>
              <p className="text-base text-texto-2">Se repite todos los años.</p>
              <DiaMes />
              <Field label="Año de nacimiento (opcional)">
                <input name="anio" inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
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
              <DiaMes />
              <div className="grid grid-cols-2 gap-3">
                <Field label={repeticion === 'nunca' ? 'Año' : 'Año (desde)'}>
                  <input name="anio" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder={repeticion === 'nunca' ? '' : 'Opcional'} className={clasesInput} />
                </Field>
                <Field label="Hora (opcional)">
                  <input name="hora" type="time" className={clasesInput} />
                </Field>
              </div>
            </>
          )}
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
