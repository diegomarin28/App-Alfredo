'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Sheet } from '@/components/ui'

type Res = { ok: true } | { ok: false; error: string }

/** Botón + hoja con formulario; cada sección pasa sus campos y su acción. */
export default function Agregar({ boton, titulo, guardar, variante, children }: {
  boton: string
  /** "suave" para los Agregar de cada sección (el principal de la pantalla queda azul) */
  variante?: 'primario' | 'suave'
  titulo: string
  guardar: (f: FormData) => Promise<Res>
  children: React.ReactNode
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await guardar(f)
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
      <Boton variante={variante} className="shrink-0" onClick={() => { setError(''); setAbierto(true) }}>{boton}</Boton>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={titulo}>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {children}
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
