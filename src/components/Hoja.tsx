'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { Icono } from './iconos'

/**
 * Fondo y panel de las hojas: en el teléfono, hoja pegada abajo de lado a lado; en computadora (lg), una
 * ventana centrada sobre la columna del contenido (a la derecha de la barra lateral de w-60, hasta 720 px).
 * Al abrir (mockup v2), el fondo se oscurece en 200 ms y la hoja sube en 260 ms; con "reducir movimiento",
 * solo aparecen.
 */
export const clasesFondoHoja = 'fixed inset-0 z-50 flex items-end bg-[rgba(20,28,40,0.38)] animate-aparecer lg:items-center lg:justify-center lg:pl-60'
export const clasesHoja = 'w-full rounded-t-[28px] bg-white px-5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.10)] motion-safe:animate-subir motion-reduce:animate-aparecer lg:max-w-[720px] lg:rounded-3xl lg:pb-5'

/** Lo que hay que arrastrar hacia abajo para cerrar la hoja. */
const UMBRAL_PX = 90

/**
 * Hoja que sube desde abajo (mockup v2): manija arriba, título, × para cerrar; se cierra también tocando
 * afuera o arrastrándola hacia abajo desde la manija o el título.
 */
export function Sheet({ abierto, onCerrar, titulo, children, rol = 'dialog' }: {
  abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode; rol?: 'dialog' | 'alertdialog'
}) {
  const panel = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ y0: number; dy: number } | null>(null)

  useEffect(() => {
    if (!abierto) return
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', alTeclado)
    return () => document.removeEventListener('keydown', alTeclado)
  }, [abierto, onCerrar])

  if (!abierto) return null

  function empezar(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as Element).closest('button, a, input, textarea, select')) return
    arrastre.current = { y0: e.clientY, dy: 0 }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  function mover(e: React.PointerEvent) {
    const a = arrastre.current
    if (!a || !panel.current) return
    a.dy = Math.max(0, e.clientY - a.y0)
    panel.current.style.transition = 'none'
    panel.current.style.transform = `translateY(${a.dy}px)`
  }
  function soltar() {
    const a = arrastre.current
    arrastre.current = null
    if (!a || !panel.current) return
    if (a.dy > UMBRAL_PX) { onCerrar(); return }
    panel.current.style.transition = 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1)'
    panel.current.style.transform = ''
  }

  return (
    <div className={clasesFondoHoja} onClick={onCerrar}>
      <div
        ref={panel} role={rol} aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[88dvh] overflow-y-auto ${clasesHoja}`}
      >
        <div onPointerDown={empezar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} className="touch-none select-none">
          <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-borde-fuerte" />
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[22px] leading-tight font-bold text-texto">{titulo}</h2>
            <button
              type="button" aria-label="Cerrar" onClick={onCerrar}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gris text-texto-2"
            >
              <Icono nombre="cerrar" tamano={20} trazo={2} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
