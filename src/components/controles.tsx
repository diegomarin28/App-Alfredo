'use client'
import { useState } from 'react'
import { Icono } from './iconos'

/**
 * Control segmentado (mockup v2): pista gris con la opción elegida en blanco. Es un grupo de botones de radio:
 * cada opción es un "radio" con su nombre.
 */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambio, className = '' }: {
  etiqueta: string; opciones: readonly (readonly [T, string])[]; valor: T; onCambio: (v: T) => void; className?: string
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`flex gap-1 rounded-[14px] bg-gris p-1 ${className}`}>
      {opciones.map(([v, texto]) => {
        const activo = v === valor
        return (
          <button
            key={v} type="button" role="radio" aria-checked={activo} onClick={() => onCambio(v)}
            className={`min-h-11 flex-1 rounded-[10px] px-2 text-base font-semibold ${activo ? 'bg-white text-azul shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-texto-2'}`}
          >
            {texto}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Círculo para tildar (pendientes, vencimientos): 26 px a la vista, 44 de toque. Al tildarlo se llena con un
 * rebote (escala 1.15 → 1 en 220 ms). Es un checkbox con el nombre de lo que tilda.
 */
export function Circulo({ marcado, nombre, onCambio, disabled = false }: {
  marcado: boolean; nombre: string; onCambio: (v: boolean) => void; disabled?: boolean
}) {
  const [recien, setRecien] = useState(false)
  return (
    <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox" checked={marcado} aria-label={nombre} disabled={disabled}
        onChange={(e) => { setRecien(e.target.checked); onCambio(e.target.checked) }}
        className="peer absolute inset-0 size-11 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        onAnimationEnd={() => setRecien(false)}
        className={`flex size-[26px] items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-azul ${
          marcado ? 'border-azul bg-azul text-white' : 'border-borde-fuerte bg-white text-transparent'
        } ${recien ? 'motion-safe:animate-rebote' : ''}`}
      >
        <Icono nombre="tilde" tamano={16} trazo={2.6} />
      </span>
    </label>
  )
}
