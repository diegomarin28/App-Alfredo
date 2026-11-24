'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Lo más que se espera a la pantalla nueva antes de mostrar la transición igual (la pantalla queda quieta mientras). */
const ESPERA_MAXIMA_MS = 400

/**
 * Transición suave entre pantallas con View Transitions, si el navegador la tiene y no se pidió reducir el
 * movimiento. Se toma el toque en un link interno, se arranca la transición y se navega adentro de ella; termina
 * cuando cambia la ruta (ya está la pantalla nueva o su esqueleto de carga) o, como mucho, a los 400 ms.
 * Sin soporte o con "reducir movimiento" no hace nada: el link navega como siempre.
 */
export default function TransicionesPantalla() {
  const router = useRouter()
  const ruta = usePathname()
  const terminar = useRef<(() => void) | null>(null)

  useEffect(() => {
    terminar.current?.()
    terminar.current = null
  }, [ruta])

  // Listas (mockup v2): una fila que se agrega a una lista que ya estaba aparece con un fundido. Al cambiar de
  // pantalla lo que entra es la pantalla entera (no una fila suelta), así que no se anima fila por fila.
  useEffect(() => {
    const obs = new MutationObserver((cambios) => {
      for (const c of cambios) {
        for (const n of c.addedNodes) if (n instanceof HTMLElement && n.hasAttribute('data-fila')) n.classList.add('aparece')
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (typeof document.startViewTransition !== 'function') return
    const reducir = matchMedia('(prefers-reduced-motion: reduce)')
    function alTocar(e: MouseEvent) {
      if (reducir.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!a || a.target || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      // Solo pantallas de la app: nada de archivos (/api) ni de otra página del mismo lugar (p. ej. ?casa=).
      if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname === location.pathname) return
      e.preventDefault() // el <Link> de Next ve el evento cancelado y no navega por su cuenta
      document.startViewTransition(() => new Promise<void>((listo) => {
        terminar.current = listo
        setTimeout(listo, ESPERA_MAXIMA_MS)
        router.push(url.pathname + url.search + url.hash)
      }))
    }
    document.addEventListener('click', alTocar, true)
    return () => document.removeEventListener('click', alTocar, true)
  }, [router])

  return null
}
