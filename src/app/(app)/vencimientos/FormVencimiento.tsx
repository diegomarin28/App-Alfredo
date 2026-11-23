'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonAgregar, Chip, Field, Sheet, clasesInput } from '@/components/ui'
import AvisoChips, { diasAviso } from '@/components/AvisoChips'
import { agregarVencimiento } from './actions'

export default function FormVencimiento() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ambito, setAmbito] = useState<'empresa' | 'personal'>('empresa')
  const [aviso, setAviso] = useState('mes')
  const [otro, setOtro] = useState('')

  function abrir() {
    setError(''); setAmbito('empresa'); setAviso('mes'); setOtro('')
    setAbierto(true)
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await agregarVencimiento({
        titulo: String(f.get('titulo') ?? ''), ambito, fecha: String(f.get('fecha') ?? ''), avisarDiasAntes: diasAviso(aviso, otro),
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
      <BotonAgregar nombre="Agregar vencimiento" onClick={abrir} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Agregar vencimiento">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div role="group" aria-label="Ámbito" className="space-y-2">
            <p className="text-base font-medium">Ámbito</p>
            <div className="flex gap-2">
              <Chip activo={ambito === 'empresa'} aria-pressed={ambito === 'empresa'} onClick={() => setAmbito('empresa')}>Empresa</Chip>
              <Chip activo={ambito === 'personal'} aria-pressed={ambito === 'personal'} onClick={() => setAmbito('personal')}>Personal</Chip>
            </div>
          </div>
          <Field label="Fecha"><input name="fecha" type="date" className={clasesInput} /></Field>
          <AvisoChips aviso={aviso} setAviso={setAviso} otro={otro} setOtro={setOtro} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
