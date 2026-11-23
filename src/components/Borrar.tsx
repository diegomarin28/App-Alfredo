'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, clasesFondoHoja, clasesHoja } from './ui'

type Res = { ok: true } | { ok: false; error: string }

/**
 * Botón "Borrar" con confirmación ("¿Borrar …?" → "Sí, borrar" / "Cancelar").
 * `accion` es una server action ya atada a su id (p. ej. `borrarFecha.bind(null, id)`).
 */
export default function Borrar({ pregunta, accion, className = '' }: {
  pregunta: string
  accion: () => Promise<Res>
  className?: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function cerrar() {
    if (enviando) return
    setAbierto(false)
    setError('')
  }

  async function confirmar() {
    setEnviando(true)
    setError('')
    try {
      const r = await accion()
      if (!r.ok) { setError(r.error); return }
      setAbierto(false)
      router.refresh()
    } catch {
      setError('No se pudo borrar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Boton variante="suave" className={className} onClick={() => setAbierto(true)}>Borrar</Boton>
      {abierto && (
        <div className={clasesFondoHoja} onClick={cerrar}>
          <div
            role="alertdialog" aria-modal="true" aria-label={pregunta}
            onClick={(e) => e.stopPropagation()}
            className={`space-y-4 ${clasesHoja}`}
          >
            <h2 className="text-xl font-semibold text-texto">{pregunta}</h2>
            {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Boton variante="suave" className="min-h-12" disabled={enviando} onClick={cerrar}>Cancelar</Boton>
              <Boton className="min-h-12" disabled={enviando} onClick={confirmar}>Sí, borrar</Boton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
