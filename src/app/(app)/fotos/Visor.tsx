'use client'
import { useEffect, useRef, useState } from 'react'
import { Icono } from '@/components/iconos'

export interface FotoVisor { id: string; url: string }

/** Lo que hay que arrastrar para pasar de foto o cerrar. */
const UMBRAL = 60

/**
 * Foto grande (pedido de Diego): deslizar izquierda/derecha para pasar de foto, "3 de 18" arriba, cerrar deslizando
 * hacia abajo o con ×, Borrar abajo. Con teclado: flechas y Escape.
 */
export default function Visor({ fotos, inicio, onCerrar, onBorrar }: {
  fotos: FotoVisor[]; inicio: number; onCerrar: () => void; onBorrar: (f: FotoVisor) => void
}) {
  const [i, setI] = useState(inicio)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)
  const arrastre = useRef<{ x0: number; y0: number; eje: 'x' | 'y' | null } | null>(null)
  const foto = fotos[Math.min(i, fotos.length - 1)]

  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight') setI((n) => Math.min(fotos.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    document.addEventListener('keydown', alTeclado)
    return () => document.removeEventListener('keydown', alTeclado)
  }, [fotos.length, onCerrar])

  useEffect(() => { if (fotos.length === 0) onCerrar() }, [fotos.length, onCerrar])
  if (!foto) return null

  function soltar() {
    const a = arrastre.current
    arrastre.current = null
    if (a?.eje === 'x' && Math.abs(dx) > UMBRAL) setI((n) => (dx < 0 ? Math.min(fotos.length - 1, n + 1) : Math.max(0, n - 1)))
    if (a?.eje === 'y' && dy > UMBRAL * 1.5) { onCerrar(); return }
    setDx(0)
    setDy(0)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white motion-safe:animate-aparecer" style={{ opacity: 1 - Math.min(dy, 300) / 600 }}>
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
        <span aria-live="polite" className="text-base font-semibold">{Math.min(i, fotos.length - 1) + 1} de {fotos.length}</span>
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="flex size-11 items-center justify-center rounded-full bg-white/15">
          <Icono nombre="cerrar" tamano={22} trazo={2} />
        </button>
      </div>
      <div
        className="relative flex flex-1 touch-none items-center justify-center overflow-hidden select-none"
        onPointerDown={(e) => { arrastre.current = { x0: e.clientX, y0: e.clientY, eje: null }; e.currentTarget.setPointerCapture?.(e.pointerId) }}
        onPointerMove={(e) => {
          const a = arrastre.current
          if (!a) return
          const mx = e.clientX - a.x0, my = e.clientY - a.y0
          if (!a.eje && Math.hypot(mx, my) > 8) a.eje = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
          if (a.eje === 'x') setDx(mx)
          if (a.eje === 'y') setDy(Math.max(0, my))
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={foto.id} src={foto.url} alt={`Foto ${i + 1} de ${fotos.length}`} draggable={false}
          className="pointer-events-none max-h-full max-w-full object-contain transition-transform duration-150 motion-reduce:transition-none"
          style={{ transform: `translate(${dx}px, ${dy}px)` }}
        />
        {i > 0 && (
          <button type="button" aria-label="Foto anterior" onClick={() => setI(i - 1)} className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 lg:flex">
            <Icono nombre="atras" tamano={22} trazo={2} />
          </button>
        )}
        {i < fotos.length - 1 && (
          <button type="button" aria-label="Foto siguiente" onClick={() => setI(i + 1)} className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 lg:flex">
            <Icono nombre="flecha" tamano={22} trazo={2} />
          </button>
        )}
      </div>
      <div className="px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button" aria-label="Borrar foto" onClick={() => onBorrar(foto)}
          className="mx-auto flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold text-[#FF8A80]"
        >
          <Icono nombre="basura" tamano={20} />Borrar
        </button>
      </div>
    </div>
  )
}
