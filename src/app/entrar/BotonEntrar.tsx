'use client'
import { startAuthentication } from '@simplewebauthn/browser'
import { useState } from 'react'

export function BotonEntrar() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar() {
    setOcupado(true)
    setError(null)
    try {
      const opciones = await fetch('/api/auth/entrar/opciones', { method: 'POST' })
      if (!opciones.ok) throw new Error('opciones')
      const respuesta = await startAuthentication({ optionsJSON: await opciones.json() })
      const verificacion = await fetch('/api/auth/entrar/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(respuesta),
      })
      if (!verificacion.ok) throw new Error('verificar')
      window.location.assign('/')
    } catch {
      setError('No se pudo entrar. Probá de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={entrar}
        disabled={ocupado}
        className="min-h-14 w-full rounded-2xl bg-azul px-6 text-lg font-semibold text-white hover:bg-azul-osc disabled:opacity-60"
      >
        Entrar con Face ID
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-urg-bg px-4 py-3 text-urg-tx">
          {error}
        </p>
      )}
    </div>
  )
}
