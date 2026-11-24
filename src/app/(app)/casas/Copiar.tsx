'use client'
import { useState } from 'react'
import { Icono } from '@/components/iconos'

/** Copia el dato de un servicio (número de cliente, cuenta) con un toque. */
export default function Copiar({ nombre, texto }: { nombre: string; texto: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* sin permiso de portapapeles */ }
  }
  return (
    <button type="button" aria-label={copiado ? `Copiado ${nombre}` : `Copiar ${nombre}`} onClick={copiar} className="flex size-11 shrink-0 items-center justify-center rounded-full text-texto-2">
      <Icono nombre={copiado ? 'tilde' : 'copiar'} tamano={20} className={copiado ? 'text-verde' : ''} />
    </button>
  )
}
