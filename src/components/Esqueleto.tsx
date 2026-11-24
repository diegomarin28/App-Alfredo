import type { ReactNode } from 'react'

/**
 * Pantallas de carga (loading.tsx): se ven al instante al tocar un link, mientras llegan los datos.
 * Bloques grises con la forma de la pantalla; laten despacio salvo con "reducir movimiento".
 */
const gris = 'rounded-xl bg-gris motion-safe:animate-pulse'

export function Esqueleto({ children }: { children: ReactNode }) {
  return (
    <div data-esqueleto role="status" aria-busy="true" className="space-y-5">
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  )
}

export const Barra = ({ className = 'h-5 w-40' }: { className?: string }) => <div aria-hidden="true" className={`${gris} ${className}`} />

/** Título de la pantalla (28 px). */
export const Titulo = ({ ancho = 'w-52' }: { ancho?: string }) => <Barra className={`h-9 ${ancho}`} />

/** Tarjetas o filas una debajo de la otra. */
export function Filas({ cantidad = 4, alto = 'h-16' }: { cantidad?: number; alto?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cantidad }, (_, i) => <Barra key={i} className={`${alto} w-full rounded-2xl`} />)}
    </div>
  )
}

/** La forma más común: título, opcionalmente un botón o filtros, y una lista. */
export function EsqueletoPagina({ filas = 4, alto = 'h-16', arriba }: { filas?: number; alto?: string; arriba?: ReactNode }) {
  return (
    <Esqueleto>
      <div className="flex items-center justify-between gap-3">
        <Titulo />
        <Barra className="h-11 w-28" />
      </div>
      {arriba}
      <Filas cantidad={filas} alto={alto} />
    </Esqueleto>
  )
}
