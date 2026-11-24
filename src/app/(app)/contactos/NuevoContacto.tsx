'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Field, Sheet, clasesInput, clasesSelect } from '@/components/ui'
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
      const r = await agregarContacto({
        nombre: String(f.get('nombre') ?? ''), grupoId: String(f.get('grupo') ?? ''), empresa: String(f.get('empresa') ?? ''),
        telefono: String(f.get('telefono') ?? ''), nota: String(f.get('nota') ?? ''),
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
      <BotonMas nombre="Agregar contacto" onClick={abrir} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo contacto">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Nombre"><input name="nombre" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          {grupos.length > 0 && (
            <Field label="Grupo (opcional)">
              <select name="grupo" defaultValue="" className={clasesSelect}>
                <option value="">Sin grupo</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </Field>
          )}
          <Field label="Empresa"><input name="empresa" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Teléfono" hint="Por ejemplo 099 123 456"><input name="telefono" type="tel" inputMode="tel" className={clasesInput} autoComplete="off" /></Field>
          <Field label="Nota"><textarea name="nota" maxLength={2000} rows={3} className={`${clasesInput} py-3`} /></Field>
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
