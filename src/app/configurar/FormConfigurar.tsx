'use client'
import { startRegistration } from '@simplewebauthn/browser'
import { useState, type FormEvent } from 'react'

export function FormConfigurar() {
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function registrar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    try {
      const opciones = await fetch('/api/auth/registro/opciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      if (opciones.status === 403) {
        const j = (await opciones.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'El código no es correcto.')
        setOcupado(false)
        return
      }
      if (!opciones.ok) throw new Error('opciones')
      const respuesta = await startRegistration({ optionsJSON: await opciones.json() })
      const verificacion = await fetch('/api/auth/registro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(respuesta),
      })
      if (!verificacion.ok) throw new Error('verificar')
      window.location.assign('/')
    } catch {
      setError('No se pudo registrar Face ID. Probá de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={registrar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-medium text-texto">Código de configuración</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="min-h-12 rounded-xl border border-borde bg-white px-4 text-lg text-texto"
        />
      </label>
      <button
        type="submit"
        disabled={ocupado || !codigo}
        className="min-h-14 w-full rounded-2xl bg-azul px-6 text-lg font-semibold text-white hover:bg-azul-osc disabled:opacity-60"
      >
        Registrar Face ID
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-urg-bg px-4 py-3 text-urg-tx">
          {error}
        </p>
      )}
    </form>
  )
}
