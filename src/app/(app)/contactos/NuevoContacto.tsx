'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Sheet } from '@/components/ui'
import { CamposContacto, entradaContacto } from '@/components/campos'
import type { Grupo } from './Contactos'
import { agregarContacto } from './actions'

export default function NuevoContacto({ grupos }: { grupos: Grupo[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  function abrir() { setError(''); setAbierto(true) }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await agregarContacto(entradaContacto(f))
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
      <BotonMas nombre="Agregar contacto" onClick={abrir} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo contacto">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <CamposContacto grupos={grupos} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
