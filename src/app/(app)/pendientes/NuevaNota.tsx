'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, LinkAgregar, Sheet, clasesInput } from '@/components/ui'
import { guardarNota } from './actions'

/** "+ Nota" (mockup v2): abre una hoja para escribir la nota. */
export default function NuevaNota() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await guardarNota(texto)
      if (!r.ok) { setError(r.error); return }
      setTexto('')
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
      <LinkAgregar nombre="Agregar nota" onClick={() => { setError(''); setAbierto(true) }}>Nota</LinkAgregar>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nueva nota">
        <form onSubmit={guardar} className="space-y-4">
          <textarea
            value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Escribir una nota" placeholder="Una idea, un dato, algo para acordarte"
            rows={5} maxLength={5000} autoFocus className={`${clasesInput} py-3`}
          />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar nota</Boton>
        </form>
      </Sheet>
    </>
  )
}
