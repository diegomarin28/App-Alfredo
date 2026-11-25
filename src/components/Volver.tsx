'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icono } from './iconos'

/** Pantallas recorridas dentro de la app desde que se abrió (se reinicia al recargar). */
let pantallas = 0

/** Cuenta cada cambio de pantalla, para saber si "Volver" tiene una pantalla anterior adonde ir. */
export function RastroNavegacion() {
  const ruta = usePathname()
  useEffect(() => { pantallas++ }, [ruta])
  return null
}

/**
 * "‹ Volver" (ronda 5), arriba a la izquierda en toda pantalla que no es una pestaña del menú de abajo: vuelve a la
 * pantalla anterior o, si se entró directo (un aviso, un link, recién abierta), a `si` (Inicio por defecto).
 * 44 px de toque como mínimo.
 */
export function Volver({ si = '/' }: { si?: string }) {
  const router = useRouter()
  return (
    <Link
      href={si} data-volver
      onClick={(e) => {
        if (pantallas <= 1 || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        router.back()
      }}
      className="-mt-3 -ml-3 inline-flex min-h-11 min-w-11 items-center gap-0.5 rounded-xl pr-3 pl-1.5 text-[17px] font-semibold text-azul"
    >
      <Icono nombre="atras" tamano={24} trazo={2.2} />Volver
    </Link>
  )
}
