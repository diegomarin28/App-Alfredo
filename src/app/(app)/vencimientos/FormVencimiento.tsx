'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Field, Sheet, clasesFechaHora, clasesInput } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import AvisoChips, { diasAviso } from '@/components/AvisoChips'
import type { UnidadAviso } from '@/domain/avisoDias'
import { agregarVencimiento } from './actions'

export default function FormVencimiento() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ambito, setAmbito] = useState<'empresa' | 'personal'>('empresa')
  const [aviso, setAviso] = useState('mes')
  const [otro, setOtro] = useState('')
  const [unidad, setUnidad] = useState<UnidadAviso>('dias')

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
        titulo: String(f.get('titulo') ?? ''), ambito, fecha: String(f.get('fecha') ?? ''), avisarDiasAntes: diasAviso(aviso, otro, unidad),
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
      <BotonMas nombre="Agregar vencimiento" onClick={abrir} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo vencimiento">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div>
            <span className="mb-1.5 block text-base font-semibold text-texto">Ámbito</span>
            <Segmentado etiqueta="Ámbito" opciones={[['empresa', 'Empresa'], ['personal', 'Personal']] as const} valor={ambito} onCambio={setAmbito} />
          </div>
          <Field label="Fecha"><input name="fecha" type="date" className={clasesFechaHora} /></Field>
          <AvisoChips aviso={aviso} setAviso={setAviso} otro={otro} setOtro={setOtro} unidad={unidad} setUnidad={setUnidad} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
