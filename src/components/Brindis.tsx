'use client'
import { useEffect, useState } from 'react'
import { Vasos } from './detalles'

/** Día en que ya brindó (en el teléfono): el brindis sale una vez por día, la primera vez que abre la app. */
export const CLAVE_BRINDIS = 'alfredo:brindis'

export function marcarBrindis(hoy: string) {
  try { localStorage.setItem(CLAVE_BRINDIS, hoy) } catch { /* sin almacenamiento: no pasa nada */ }
}

/**
 * Whisky (mockup v2): el día de su cumpleaños, al abrir la app por primera vez ese día, dos vasos brindan y
 * "¡Salud, Alfredo! Feliz cumpleaños." con "Gracias". No tapa nada: se puede seguir tocando la pantalla.
 */
export default function Brindis({ hoy, nombre }: { hoy: string; nombre: string }) {
  const [ver, setVer] = useState(false)
  useEffect(() => {
    let visto: string | null = null
    try { visto = localStorage.getItem(CLAVE_BRINDIS) } catch { /* sin almacenamiento: se muestra */ }
    if (visto === hoy) return
    marcarBrindis(hoy)
    setVer(true)
  }, [hoy])
  if (!ver) return null
  return (
    <section
      aria-label="Brindis de cumpleaños"
      className="fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-[46] mx-auto flex max-w-md flex-col items-center gap-3 rounded-[28px] bg-gradient-to-b from-azul to-azul-osc px-5 pt-5 pb-4 text-center text-white shadow-[0_16px_40px_rgba(24,62,112,0.35)] motion-safe:animate-entrar lg:left-60"
    >
      <Vasos ancho={230} />
      <div className="dt-brindis-texto space-y-1">
        <p className="text-[28px] leading-tight font-bold">¡Salud, {nombre}!</p>
        <p className="text-[17px] text-white/90">Feliz cumpleaños. Que sea un gran año.</p>
      </div>
      <button type="button" onClick={() => setVer(false)} className="min-h-12 w-full rounded-2xl bg-white text-lg font-semibold text-azul">Gracias</button>
    </section>
  )
}

/** En la Bienvenida (que ya brinda arriba): el brindis de hoy ya está hecho. */
export function BrindisHecho({ hoy }: { hoy: string }) {
  useEffect(() => marcarBrindis(hoy), [hoy])
  return null
}
