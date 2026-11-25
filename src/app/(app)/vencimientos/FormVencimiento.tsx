'use client'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Field, Sheet, clasesFechaHora, clasesInput } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import AvisoChips, { claveAviso, diasAviso, otroDesdeDias } from '@/components/AvisoChips'
import type { UnidadAviso } from '@/domain/avisoDias'
import { agregarVencimiento, editarVencimiento } from './actions'

export interface InicialVencimiento { id: string; titulo: string; ambito: 'empresa' | 'personal'; fecha: string; avisarDiasAntes: number }

/** Con `inicial` (ronda 6) es la hoja de editar: se abre tocando la fila (`children`), con los datos cargados. */
export default function FormVencimiento({ inicial, children, className = '' }: { inicial?: InicialVencimiento; children?: ReactNode; className?: string } = {}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const claveIni = inicial ? claveAviso(inicial.avisarDiasAntes) : 'mes'
  const otroIni = inicial && claveIni === 'otro' ? otroDesdeDias(inicial.avisarDiasAntes) : { otro: '', unidad: 'dias' as UnidadAviso }
  const [ambito, setAmbito] = useState<'empresa' | 'personal'>(inicial?.ambito ?? 'empresa')
  const [aviso, setAviso] = useState(claveIni)
  const [otro, setOtro] = useState(otroIni.otro)
  const [unidad, setUnidad] = useState<UnidadAviso>(otroIni.unidad)

  function abrir() {
    setError(''); setAmbito(inicial?.ambito ?? 'empresa'); setAviso(claveIni); setOtro(otroIni.otro); setUnidad(otroIni.unidad)
    setAbierto(true)
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const entrada = { titulo: String(f.get('titulo') ?? ''), ambito, fecha: String(f.get('fecha') ?? ''), avisarDiasAntes: diasAviso(aviso, otro, unidad) }
      const r = inicial ? await editarVencimiento(inicial.id, entrada) : await agregarVencimiento(entrada)
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
        ? <button type="button" aria-label={`Editar ${inicial.titulo}`} data-editar onClick={abrir} className={`min-w-0 flex-1 text-left ${className}`}>{children}</button>
        : <BotonMas nombre="Agregar vencimiento" onClick={abrir} />}
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={inicial ? 'Editar vencimiento' : 'Nuevo vencimiento'}>
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Título"><input name="titulo" defaultValue={inicial?.titulo ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div>
            <span className="mb-1.5 block text-base font-semibold text-texto">Ámbito</span>
            <Segmentado etiqueta="Ámbito" opciones={[['empresa', 'Empresa'], ['personal', 'Personal']] as const} valor={ambito} onCambio={setAmbito} />
          </div>
          <Field label="Fecha"><input name="fecha" type="date" defaultValue={inicial?.fecha ?? ''} className={clasesFechaHora} /></Field>
          <AvisoChips aviso={aviso} setAviso={setAviso} otro={otro} setOtro={setOtro} unidad={unidad} setUnidad={setUnidad} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
