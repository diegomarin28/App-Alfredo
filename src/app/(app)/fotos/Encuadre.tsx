'use client'
import { useRef, useState } from 'react'

/** Proporción del marco de la foto del día en Inicio. */
export const MARCO = 16 / 9

/**
 * La foto en el marco 16:9 de Inicio; arrastrándola se elige qué parte se ve (foco 0..1, como object-position).
 */
export default function Encuadre({ url, foco, onFoco, nombre }: {
  url: string; foco: { x: number; y: number }; onFoco: (f: { x: number; y: number }) => void; nombre: string
}) {
  const marco = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const arrastre = useRef<{ x0: number; y0: number; fx: number; fy: number } | null>(null)
  const [moviendo, setMoviendo] = useState(false)

  /** Cuánto sobra la foto (en px) a lo ancho y a lo alto al cubrir el marco. */
  function sobra() {
    const m = marco.current, i = img.current
    if (!m || !i || !i.naturalWidth) return { x: 0, y: 0 }
    const proporcion = i.naturalWidth / i.naturalHeight
    const w = m.clientWidth, h = m.clientHeight
    return proporcion > w / h ? { x: h * proporcion - w, y: 0 } : { x: 0, y: w / proporcion - h }
  }

  return (
    <div
      ref={marco}
      role="img" aria-label={`${nombre}: arrastrala para encuadrar`}
      className={`relative aspect-[16/9] w-full touch-none overflow-hidden rounded-2xl bg-gris select-none ${moviendo ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={(e) => {
        arrastre.current = { x0: e.clientX, y0: e.clientY, fx: foco.x, fy: foco.y }
        setMoviendo(true)
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        const a = arrastre.current
        if (!a) return
        const s = sobra()
        const lim = (v: number) => Math.min(1, Math.max(0, v))
        onFoco({
          x: s.x > 0 ? lim(a.fx - (e.clientX - a.x0) / s.x) : 0.5,
          y: s.y > 0 ? lim(a.fy - (e.clientY - a.y0) / s.y) : 0.5,
        })
      }}
      onPointerUp={() => { arrastre.current = null; setMoviendo(false) }}
      onPointerCancel={() => { arrastre.current = null; setMoviendo(false) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img} src={url} alt="" draggable={false}
        className="pointer-events-none size-full object-cover"
        style={{ objectPosition: `${foco.x * 100}% ${foco.y * 100}%` }}
      />
    </div>
  )
}
