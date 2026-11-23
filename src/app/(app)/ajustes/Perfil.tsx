'use client'
import { useState } from 'react'
import { Boton, Field, clasesInput } from '@/components/ui'
import { MAX_ESTILO, MAX_NOMBRE } from '@/domain/validarAjustes'
import { guardarEstilo, guardarNombre } from './actions'

type Respuesta = { ok: true } | { ok: false; error: string }

function Formulario({ etiqueta, boton, guardar, inicial, largo, ayuda }: {
  etiqueta: string; boton: string; guardar: (t: string) => Promise<Respuesta>; inicial: string; largo?: boolean; ayuda?: string
}) {
  const [texto, setTexto] = useState(inicial)
  const [estado, setEstado] = useState<'quieto' | 'guardando' | 'guardado' | 'error'>('quieto')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('guardando')
    try {
      const r = await guardar(texto)
      if (r.ok) setEstado('guardado')
      else { setError(r.error); setEstado('error') }
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
      setEstado('error')
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Field label={etiqueta} hint={ayuda}>
        {largo
          ? <textarea value={texto} rows={8} onChange={(e) => { setTexto(e.target.value); setEstado('quieto') }} className={`${clasesInput} py-2`} />
          : <input value={texto} maxLength={MAX_NOMBRE + 20} autoComplete="off" onChange={(e) => { setTexto(e.target.value); setEstado('quieto') }} className={clasesInput} />}
      </Field>
      <Boton type="submit" disabled={estado === 'guardando'}>{boton}</Boton>
      {estado === 'guardado' && <p role="status" className="text-base font-medium text-azul">Guardado</p>}
      {estado === 'error' && <p role="alert" className="text-base font-medium text-urg-tx">{error}</p>}
    </form>
  )
}

export default function Perfil({ nombre, estilo }: { nombre: string; estilo: string }) {
  return (
    <div className="space-y-6">
      <Formulario etiqueta="Cómo te saludan" boton="Guardar nombre" guardar={guardarNombre} inicial={nombre} />
      <Formulario
        etiqueta="Cómo escribís" boton="Guardar cómo escribís" guardar={guardarEstilo} inicial={estilo} largo
        ayuda={`Pegá 3 o 4 mensajes reales que mandaste, así los borradores suenan a vos. Hasta ${MAX_ESTILO} letras.`}
      />
    </div>
  )
}
