'use client'
import { useState } from 'react'
import { Boton, Field, clasesInput } from '@/components/ui'
import { useTextoEscrito } from '@/components/useTextoEscrito'
import { MAX_ESTILO, MAX_NOMBRE } from '@/domain/validarAjustes'
import { guardarPerfil } from './actions'

/** Cómo te saludan y cómo escribís, con un solo "Guardar" (mockup v2). */
export default function Perfil({ nombre, estilo }: { nombre: string; estilo: string }) {
  const [texto, setTexto, campoNombre] = useTextoEscrito(nombre)
  const [ejemplos, setEjemplos, campoEstilo] = useTextoEscrito(estilo)
  const [estado, setEstado] = useState<'quieto' | 'guardando' | 'guardado' | 'error'>('quieto')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('guardando')
    try {
      const r = await guardarPerfil(texto, ejemplos)
      if (r.ok) setEstado('guardado')
      else { setError(r.error); setEstado('error') }
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
      setEstado('error')
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Cómo te saludan">
        <input
          {...campoNombre} value={texto} maxLength={MAX_NOMBRE + 20} autoComplete="off"
          onChange={(e) => { setTexto(e.target.value); setEstado('quieto') }} className={clasesInput}
        />
      </Field>
      <Field label="Cómo escribís" hint={`Pegá 3 o 4 mensajes tuyos y las respuestas van a sonar a vos. Hasta ${MAX_ESTILO} letras.`}>
        <textarea
          {...campoEstilo} value={ejemplos} rows={4} placeholder='Ej.: "Hola Martín, el viernes lo cerramos. Saludos, Alfredo."'
          onChange={(e) => { setEjemplos(e.target.value); setEstado('quieto') }} className={`${clasesInput} py-3`}
        />
      </Field>
      <Boton type="submit" className="w-full" disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</Boton>
      {estado === 'guardado' && <p role="status" className="text-base font-semibold text-azul">Guardado</p>}
      {estado === 'error' && <p role="alert" className="text-base font-semibold text-urg-tx">{error}</p>}
    </form>
  )
}
