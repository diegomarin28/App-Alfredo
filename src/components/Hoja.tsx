'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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

let bloqueos = 0
let antes: { y: number; body: string; html: string } | null = null

/**
 * Con una hoja (o la foto grande) abierta, la pantalla de atrás no se mueve (ronda 5). En iOS no alcanza con
 * overflow: hidden: se fija el body donde estaba y, al cerrar, se vuelve a esa posición. Cuenta las hojas abiertas
 * (una arriba de otra) y libera con la última.
 */
export function useBloquearFondo(activo: boolean) {
  useEffect(() => {
    if (!activo) return
    if (bloqueos++ === 0) {
      const body = document.body.style, html = document.documentElement.style
      antes = { y: window.scrollY, body: body.cssText, html: html.overscrollBehavior }
      Object.assign(body, { position: 'fixed', top: `-${antes.y}px`, left: '0', right: '0', overflow: 'hidden' })
      html.overscrollBehavior = 'none'
    }
    return () => {
      if (--bloqueos > 0 || !antes) return
      const { y, body, html } = antes
      antes = null
      document.body.style.cssText = body
      document.documentElement.style.overscrollBehavior = html
      window.scrollTo({ top: y, behavior: 'instant' })
    }
  }, [activo])
}

/**
 * Lo que se ve de la pantalla cuando sale el teclado (visualViewport): alto y desde dónde (offsetTop). null si el
 * teclado no tapa nada. Así la hoja se ubica arriba del teclado y el campo que tiene el foco queda a la vista.
 */
function useVisible(activo: boolean, panel: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState<{ alto: number; arriba: number } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!activo || !vv) return
    const medir = () => {
      const tapado = document.documentElement.clientHeight - vv.height
      setVisible(tapado > 1 || vv.offsetTop > 0 ? { alto: vv.height, arriba: vv.offsetTop } : null)
      const foco = document.activeElement
      if (foco instanceof HTMLElement && panel.current?.contains(foco)) requestAnimationFrame(() => foco.scrollIntoView({ block: 'nearest' }))
    }
    medir()
    vv.addEventListener('resize', medir)
    vv.addEventListener('scroll', medir)
    return () => {
      vv.removeEventListener('resize', medir)
      vv.removeEventListener('scroll', medir)
      setVisible(null)
    }
  }, [activo, panel])
  return visible
}

/**
 * Hoja que sube desde abajo (mockup v2): manija arriba, título, × para cerrar; se cierra también tocando
 * afuera o arrastrándola hacia abajo desde la manija o el título.
 */
export function Sheet({ abierto, onCerrar, titulo, children, rol = 'dialog' }: {
  abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode; rol?: 'dialog' | 'alertdialog'
}) {
  const panel = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ y0: number; dy: number } | null>(null)
  useBloquearFondo(abierto)
  const visible = useVisible(abierto, panel)

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
    <div
      className={clasesFondoHoja} onClick={onCerrar}
      // con el teclado: el fondo ocupa solo lo visible, y la hoja (pegada abajo) queda arriba del teclado
      style={visible ? { top: visible.arriba, height: visible.alto, bottom: 'auto' } : undefined}
    >
      <div
        ref={panel} role={rol} aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        // scroll solo vertical y sin arrastrar la pantalla de atrás; nada se puede mover para los costados
        className={`max-h-[88dvh] touch-pan-y touch-pinch-zoom overflow-x-hidden overflow-y-auto overscroll-contain ${clasesHoja}`}
        style={visible ? { maxHeight: visible.alto - 8 } : undefined}
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
