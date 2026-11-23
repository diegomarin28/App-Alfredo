'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Chip, Field, Sheet, clasesInput } from '@/components/ui'
import { agregarContacto } from './actions'

type Tipo = 'cliente' | 'proveedor' | 'otro'
const TIPOS: [Tipo, string][] = [['cliente', 'Cliente'], ['proveedor', 'Proveedor'], ['otro', 'Otro']]

export default function NuevoContacto() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [tipo, setTipo] = useState<Tipo>('cliente')

  function abrir() { setError(''); setTipo('cliente'); setAbierto(true) }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      const r = await agregarContacto({
        nombre: String(f.get('nombre') ?? ''), tipo, empresa: String(f.get('empresa') ?? ''),
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
      <Boton onClick={abrir}>Agregar contacto</Boton>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Agregar contacto">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Field label="Nombre"><input name="nombre" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <div role="group" aria-label="Tipo" className="space-y-2">
            <p className="text-base font-medium">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(([v, t]) => <Chip key={v} activo={tipo === v} aria-pressed={tipo === v} onClick={() => setTipo(v)}>{t}</Chip>)}
            </div>
          </div>
          <Field label="Empresa"><input name="empresa" maxLength={80} className={clasesInput} autoComplete="off" /></Field>
          <Field label="Teléfono" hint="Por ejemplo 099 123 456"><input name="telefono" type="tel" inputMode="tel" className={clasesInput} autoComplete="off" /></Field>
          <Field label="Nota"><textarea name="nota" maxLength={2000} rows={3} className={`${clasesInput} py-2`} /></Field>
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}
