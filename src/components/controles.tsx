'use client'
import { useState } from 'react'
import { Icono } from './iconos'
import { DIAS_SEMANA } from '@/domain/repeticion'

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

/**
 * Días de la semana (ronda 5): chips L M M J V S D para "Todas las semanas". Se pueden marcar varios; siempre queda
 * al menos uno (el último marcado no se desmarca). Cada chip es un checkbox con el nombre del día.
 */
export function DiasSemana({ valor, onCambio }: { valor: number[]; onCambio: (dias: number[]) => void }) {
  return (
    <div role="group" aria-label="Qué días" className="flex justify-between gap-1">
      {DIAS_SEMANA.map(([n, letra, nombre]) => {
        const marcado = valor.includes(n)
        return (
          <button
            key={n} type="button" role="checkbox" aria-checked={marcado} aria-label={nombre}
            onClick={() => {
              if (marcado && valor.length === 1) return
              onCambio(marcado ? valor.filter((d) => d !== n) : [...valor, n].sort((a, b) => a - b))
            }}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold ${marcado ? 'bg-azul text-white' : 'border border-borde bg-white text-texto-2'}`}
          >
            {letra}
          </button>
        )
      })}
    </div>
  )
}

/** Campo "Qué días" de "Todas las semanas" (Calendario y Recordatorios). */
export function CampoDias({ dias, setDias }: { dias: number[]; setDias: (d: number[]) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-base font-semibold text-texto">Qué días</span>
      <DiasSemana valor={dias} onCambio={setDias} />
    </div>
  )
}
