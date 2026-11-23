'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonAgregar, Field, Sheet, clasesInput } from '@/components/ui'
import { MESES } from '@/domain/validarFecha'
import { agregarFecha } from './actions'

export default function NuevaFecha() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
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
        nombre: String(f.get('nombre') ?? ''), tipo: String(f.get('tipo')),
        dia: Number(f.get('dia')), mes: Number(f.get('mes')), anio: anio ? Number(anio) : null,
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
      <BotonAgregar nombre="Agregar fecha" onClick={() => { setError(''); setAbierto(true) }} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Agregar fecha">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Nombre"><input name="nombre" className={clasesInput} autoComplete="off" /></Field>
          <Field label="Tipo">
            <select name="tipo" aria-label="Tipo" defaultValue="cumple" className={clasesInput}>
              <option value="cumple">Cumpleaños</option>
              <option value="aniversario">Aniversario</option>
              <option value="otra">Otra</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <select name="dia" aria-label="Día" defaultValue="1" className={clasesInput}>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </Field>
            <Field label="Mes">
              <select name="mes" aria-label="Mes" defaultValue="1" className={clasesInput}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Año de nacimiento" hint="Opcional. Sirve para saber cuántos cumple.">
            <input name="anio" inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
          </Field>
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
