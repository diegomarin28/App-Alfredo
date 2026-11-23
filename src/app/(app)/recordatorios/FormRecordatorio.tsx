'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonAgregar, Field, Sheet, clasesInput } from '@/components/ui'
import AvisoChips, { claveAviso, diasAviso } from '@/components/AvisoChips'
import { MESES } from '@/domain/validarFecha'
import { guardarRecordatorio } from './actions'

function numeroONulo(v: FormDataEntryValue | null): number | null {
  return v === null || v === '' ? null : Number(v)
}

export interface Inicial { id: string; titulo: string; dia: string | null; avisarDiasAntes: number }

export default function FormRecordatorio({ inicial, etiqueta, soloIcono }: { inicial?: Inicial; etiqueta: string; soloIcono?: boolean }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const claveInicial = inicial ? claveAviso(inicial.avisarDiasAntes) : 'mes'
  const [aviso, setAviso] = useState<string>(claveInicial)
  const [otro, setOtro] = useState(inicial ? String(inicial.avisarDiasAntes) : '')

  function abrir() {
    setError('')
    setAviso(claveInicial)
    setOtro(inicial ? String(inicial.avisarDiasAntes) : '')
    setAbierto(true)
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const dias = diasAviso(aviso, otro)
    setEnviando(true)
    setError('')
    try {
      const r = await guardarRecordatorio(inicial?.id ?? null, {
        titulo: String(f.get('titulo') ?? ''), dia: numeroONulo(f.get('dia')), mes: numeroONulo(f.get('mes')), avisarDiasAntes: dias,
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

  const mmdd = inicial?.dia ?? null
  const diaIni = mmdd ? Number(mmdd.slice(3)) : ''
  const mesIni = mmdd ? Number(mmdd.slice(0, 2)) : ''

  return (
    <>
      {soloIcono ? <Boton variante="suave" onClick={abrir}>{etiqueta}</Boton> : <BotonAgregar nombre={etiqueta} onClick={abrir} />}
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={inicial ? 'Editar recordatorio' : 'Agregar recordatorio'}>
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" defaultValue={inicial?.titulo ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <select name="dia" aria-label="Día" defaultValue={diaIni} className={clasesInput}>
                <option value="">Elegí</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </Field>
            <Field label="Mes">
              <select name="mes" aria-label="Mes" defaultValue={mesIni} className={clasesInput}>
                <option value="">Elegí</option>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <AvisoChips aviso={aviso} setAviso={setAviso} otro={otro} setOtro={setOtro} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
