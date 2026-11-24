'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Icono } from './iconos'

type Res = { ok: true } | { ok: false; error: string }

/** Lo que tarda en borrarse de verdad: mientras tanto se puede deshacer (mockup v2: 5 s). */
export const SEGUNDOS_DESHACER = 5

interface Pendiente {
  texto: string
  /** borra de verdad (server action) */
  ejecutar: () => Promise<Res>
  /** vuelve a mostrar lo que se plegó */
  deshacer: () => void
}

const Contexto = createContext<((p: Pendiente) => void) | null>(null)

/**
 * Borrar con "Deshacer" (mockup v2): la fila se pliega al instante y abajo aparece "Se borró … · Deshacer"
 * durante 5 s; recién después se borra de verdad. Si se borra otra cosa, o la página se cierra, lo anterior
 * se borra ya. Vive en el layout para que el aviso sobreviva a un cambio de pantalla.
 */
export function ProveedorDeshacer({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [aviso, setAviso] = useState<{ id: number; texto: string; error?: boolean } | null>(null)
  const actual = useRef<{ id: number; p: Pendiente; timer: ReturnType<typeof setTimeout> } | null>(null)

  const ejecutar = useCallback(async (id: number, p: Pendiente) => {
    let r: Res
    try { r = await p.ejecutar() } catch { r = { ok: false, error: 'No se pudo borrar. Probá de nuevo.' } }
    if (!r.ok) {
      p.deshacer()
      setAviso({ id, texto: r.error, error: true })
      return
    }
    setAviso((a) => (a?.id === id ? null : a))
    router.refresh()
  }, [router])

  /** Borra ya lo que estaba esperando (si había). */
  const vaciar = useCallback(() => {
    const a = actual.current
    if (!a) return
    actual.current = null
    clearTimeout(a.timer)
    void ejecutar(a.id, a.p)
  }, [ejecutar])

  const programar = useCallback((p: Pendiente) => {
    vaciar()
    const id = Date.now()
    const timer = setTimeout(() => {
      if (actual.current?.id !== id) return
      actual.current = null
      void ejecutar(id, p)
    }, SEGUNDOS_DESHACER * 1000)
    actual.current = { id, p, timer }
    setAviso({ id, texto: p.texto })
  }, [ejecutar, vaciar])

  function deshacer() {
    const a = actual.current
    if (!a) return
    actual.current = null
    clearTimeout(a.timer)
    a.p.deshacer()
    setAviso(null)
  }

  useEffect(() => {
    window.addEventListener('pagehide', vaciar)
    return () => window.removeEventListener('pagehide', vaciar)
  }, [vaciar])

  return (
    <Contexto.Provider value={programar}>
      {children}
      {aviso && (
        <div
          role={aviso.error ? 'alert' : 'status'}
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[45] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-texto px-4 py-2 text-base text-white shadow-lg motion-safe:animate-entrar lg:bottom-6 lg:left-60"
        >
          <span>{aviso.texto}</span>
          {aviso.error
            ? <button type="button" onClick={() => setAviso(null)} className="min-h-11 rounded-xl px-3 font-semibold text-white">Cerrar</button>
            : <button type="button" onClick={deshacer} className="min-h-11 rounded-xl px-3 font-semibold text-amarillo">Deshacer</button>}
        </div>
      )}
    </Contexto.Provider>
  )
}

/** Pliega la fila en 200 ms (ver .plegandose en globals.css). Devuelve cómo volver a mostrarla. */
function plegar(fila: HTMLElement | null): () => void {
  if (!fila) return () => {}
  const alto = fila.offsetHeight
  fila.style.height = `${alto}px`
  fila.classList.add('plegandose')
  void fila.offsetHeight
  Object.assign(fila.style, { height: '0px', opacity: '0', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderWidth: '0px' })
  fila.setAttribute('aria-hidden', 'true')
  fila.inert = true
  return () => {
    fila.classList.remove('plegandose')
    for (const p of ['height', 'opacity', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'border-width']) fila.style.removeProperty(p)
    fila.removeAttribute('aria-hidden')
    fila.inert = false
  }
}

/**
 * Borrar con "Deshacer" desde cualquier lado (p. ej. la foto grande): pliega `fila` y deja 5 s para deshacer.
 * Fuera del proveedor borra directo.
 */
export function useBorrar(): (o: { nombre: string; accion: () => Promise<Res>; fila: HTMLElement | null; alDeshacer?: () => void }) => Promise<void> {
  const programar = useContext(Contexto)
  const router = useRouter()
  return async ({ nombre, accion, fila, alDeshacer }) => {
    if (!programar) {
      const r = await accion()
      if (r.ok) router.refresh()
      return
    }
    const mostrar = plegar(fila)
    programar({ texto: `Se borró ${nombre}`, ejecutar: accion, deshacer: () => { mostrar(); alDeshacer?.() } })
  }
}

/**
 * Basurita roja de 44 px, sin fondo (mockup v2). Pliega su fila (el elemento [data-fila] que la contiene) y
 * deja 5 s para deshacer. `accion` es una server action ya atada a su id (p. ej. `borrarFecha.bind(null, id)`).
 */
export default function BotonBorrar({ nombre, accion }: { nombre: string; accion: () => Promise<Res> }) {
  const borrar = useBorrar()
  const boton = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={boton} type="button" aria-label={`Borrar ${nombre}`}
      onClick={() => borrar({ nombre, accion, fila: boton.current?.closest<HTMLElement>('[data-fila]') ?? null })}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-rojo"
    >
      <Icono nombre="basura" tamano={20} />
    </button>
  )
}
