'use client'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Sheet } from './ui'

type Res = { ok: true } | { ok: false; error: string }

/** El formulario adentro de la hoja: se monta al abrir, así cada vez arranca con los datos y sin error. */
function Formulario({ guardar, onListo, children }: { guardar: (f: FormData) => Promise<Res>; onListo: () => void; children: ReactNode }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await guardar(f)
      if (!r.ok) { setError(r.error); return }
      onListo()
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {children}
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
    </form>
  )
}

/** Hoja de edición (ronda 6): los campos con los datos cargados y "Guardar". */
export function HojaEditar({ abierto, onCerrar, titulo, guardar, children }: {
  abierto: boolean; onCerrar: () => void; titulo: string; guardar: (f: FormData) => Promise<Res>; children: ReactNode
}) {
  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <Formulario guardar={guardar} onListo={onCerrar}>{children}</Formulario>
    </Sheet>
  )
}

/**
 * Ronda 6: todo se edita tocándolo. El contenido de la fila es un botón que abre la hoja de edición; lo que va al
 * costado (borrar, llamar, copiar) queda afuera y sigue como estaba.
 */
export function TocarParaEditar({ etiqueta, titulo, guardar, campos, children, className = '' }: {
  /** "Editar Simón": para lectores de pantalla y pruebas */
  etiqueta: string
  titulo: string
  guardar: (f: FormData) => Promise<Res>
  campos: ReactNode
  children: ReactNode
  className?: string
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" aria-label={etiqueta} data-editar onClick={() => setAbierto(true)} className={`min-w-0 flex-1 rounded-xl text-left ${className}`}>
        {children}
      </button>
      <HojaEditar abierto={abierto} onCerrar={() => setAbierto(false)} titulo={titulo} guardar={guardar}>{campos}</HojaEditar>
    </>
  )
}
