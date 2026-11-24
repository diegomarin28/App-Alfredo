'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { VasoHielo } from './detalles'

/** Lo que hay que tirar hacia abajo (px) para actualizar. */
const UMBRAL = 70
/** Lo mínimo que se ve el hielo cayendo, aunque los datos lleguen antes. */
const MINIMO_MS = 1200

/**
 * Deslizar hacia abajo para actualizar (Inicio). En vez de la ruedita, un hielo cae en el vaso (mockup v2).
 * Solo con el dedo y con la página arriba de todo.
 */
export default function Actualizar({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [tiron, setTiron] = useState(0)
  const [actualizando, setActualizando] = useState(false)
  const inicio = useRef<number | null>(null)
  const ultimo = useRef(0)

  useEffect(() => {
    function empezar(e: TouchEvent) {
      inicio.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
      ultimo.current = 0
    }
    function mover(e: TouchEvent) {
      if (inicio.current === null) return
      const dy = e.touches[0].clientY - inicio.current
      ultimo.current = dy > 0 ? Math.min(dy * 0.5, 100) : 0
      setTiron(ultimo.current)
    }
    function soltar() {
      if (inicio.current === null) return
      inicio.current = null
      const listo = ultimo.current >= UMBRAL
      setTiron(0)
      if (!listo) return
      setActualizando(true)
      router.refresh()
      setTimeout(() => setActualizando(false), MINIMO_MS)
    }
    window.addEventListener('touchstart', empezar, { passive: true })
    window.addEventListener('touchmove', mover, { passive: true })
    window.addEventListener('touchend', soltar)
    window.addEventListener('touchcancel', soltar)
    return () => {
      window.removeEventListener('touchstart', empezar)
      window.removeEventListener('touchmove', mover)
      window.removeEventListener('touchend', soltar)
      window.removeEventListener('touchcancel', soltar)
    }
  }, [router])

  const alto = actualizando ? 96 : tiron
  return (
    <>
      <div
        aria-hidden={alto === 0}
        className="flex flex-col items-center justify-end gap-1 overflow-hidden transition-[height] duration-200"
        style={{ height: alto }}
      >
        {alto > 0 && (
          <>
            <VasoHielo animar={actualizando} />
            <span role="status" className="text-base font-semibold text-texto-2">
              {actualizando ? 'Actualizando' : tiron >= UMBRAL ? 'Soltá para actualizar' : 'Deslizá para actualizar'}
            </span>
          </>
        )}
      </div>
      {children}
    </>
  )
}
