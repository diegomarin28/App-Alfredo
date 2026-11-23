'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Chip, Field, Sheet, clasesInput } from '@/components/ui'
import { MESES } from '@/domain/validarFecha'
import { guardarRecordatorio } from './actions'

const OPCIONES = [
  { clave: 'semana', texto: '1 semana', dias: 7 },
  { clave: 'mes', texto: '1 mes', dias: 30 },
  { clave: 'meses', texto: '2 meses', dias: 60 },
] as const

export interface Inicial { id: string; titulo: string; dia: string | null; avisarDiasAntes: number }

export default function FormRecordatorio({ inicial, etiqueta, soloIcono }: { inicial?: Inicial; etiqueta: string; soloIcono?: boolean }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const claveInicial = inicial ? (OPCIONES.find((o) => o.dias === inicial.avisarDiasAntes)?.clave ?? 'otro') : 'mes'
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
    const dias = aviso === 'otro' ? Number(otro) : OPCIONES.find((o) => o.clave === aviso)!.dias
    setEnviando(true)
    setError('')
    try {
      const r = await guardarRecordatorio(inicial?.id ?? null, {
        titulo: String(f.get('titulo') ?? ''), dia: Number(f.get('dia')), mes: Number(f.get('mes')), avisarDiasAntes: dias,
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
  const diaIni = mmdd ? Number(mmdd.slice(3)) : 1
  const mesIni = mmdd ? Number(mmdd.slice(0, 2)) : 1

  return (
    <>
      <Boton variante={soloIcono ? 'suave' : 'primario'} onClick={abrir}>{etiqueta}</Boton>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={inicial ? 'Editar recordatorio' : 'Agregar recordatorio'}>
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" defaultValue={inicial?.titulo ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <select name="dia" aria-label="Día" defaultValue={diaIni} className={clasesInput}>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </Field>
            <Field label="Mes">
              <select name="mes" aria-label="Mes" defaultValue={mesIni} className={clasesInput}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div role="group" aria-label="Avisarme con" className="space-y-2">
            <p className="text-base font-medium">Avisarme con</p>
            <div className="flex flex-wrap gap-2">
              {OPCIONES.map((o) => (
                <Chip key={o.clave} activo={aviso === o.clave} aria-pressed={aviso === o.clave} onClick={() => setAviso(o.clave)}>{o.texto}</Chip>
              ))}
              <Chip activo={aviso === 'otro'} aria-pressed={aviso === 'otro'} onClick={() => setAviso('otro')}>Otro</Chip>
            </div>
            {aviso === 'otro' && (
              <Field label="Cantidad de días">
                <input value={otro} onChange={(e) => setOtro(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={3} className={clasesInput} />
              </Field>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
