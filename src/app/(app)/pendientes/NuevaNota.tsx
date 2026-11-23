'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, clasesInput } from '@/components/ui'
import { useTextoEscrito } from '@/components/useTextoEscrito'
import { guardarNota } from './actions'

export default function NuevaNota() {
  const router = useRouter()
  const [texto, setTexto, campo] = useTextoEscrito('')
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
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <textarea
        {...campo} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Escribir una nota" placeholder="Escribir una nota"
        rows={4} maxLength={5000} className={`${clasesInput} py-2`}
      />
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <Boton type="submit" disabled={enviando}>Guardar nota</Boton>
    </form>
  )
}
