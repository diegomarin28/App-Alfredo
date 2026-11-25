'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useDictado, type Dictado } from './useDictado'
import { anotar } from './registro'
import { tomarTeclado } from './puenteTeclado'

/**
 * Pedido de pasar a la caja del teclado en Contame: 'fallo' (el dictado web no anduvo: sordo, error o sin audio;
 * el aviso dice "Seguí con el 🎤 del teclado") o 'teclado' (el micrófono del menú cuando el dictado web ya se usó).
 */
export type PedidoTeclado = 'fallo' | 'teclado'

export interface DictadoCompartido extends Dictado {
  pedidoTeclado: PedidoTeclado | null
  /** Contame ya pasó a la caja */
  atenderTeclado(): void
  /** el micrófono del menú de abajo (ver el comentario de ProveedorDictado) */
  tocarMenu(): void
}

const Contexto = createContext<DictadoCompartido | null>(null)

/** El dictado de la app (null fuera del proveedor, p. ej. en las pruebas de un componente suelto). */
export function useDictadoCompartido(): DictadoCompartido | null {
  return useContext(Contexto)
}

const RUTA_CONTAME = '/contame'

/**
 * Ronda 12: el reconocedor vive acá, a nivel del layout de la app, y no en la página de Contame: así el micrófono
 * del menú lo arranca dentro del mismo toque (iOS lo exige) y sigue escuchando mientras se navega a Contame.
 * Si Alfredo sale de Contame mientras escucha, se corta.
 */
export function ProveedorDictado({ children }: { children: React.ReactNode }) {
  const [pedidoTeclado, setPedidoTeclado] = useState<PedidoTeclado | null>(null)
  const alFallar = useCallback(() => setPedidoTeclado('fallo'), [])
  const dictado = useDictado({ lang: 'es-UY', alFallar })
  const ruta = usePathname()

  const escuchando = useRef(dictado.escuchando)
  useEffect(() => {
    escuchando.current = dictado.escuchando
  }, [dictado.escuchando])

  // Solo cuando cambia la pantalla (no cuando empieza a escuchar: desde el menú arranca antes de llegar a Contame).
  const { terminar } = dictado
  useEffect(() => {
    if (ruta !== RUTA_CONTAME && escuchando.current) {
      anotar(0, `salí de Contame (${ruta}): corto la grabación`)
      terminar()
    }
  }, [ruta, terminar])

  const atenderTeclado = useCallback(() => setPedidoTeclado(null), [])

  /**
   * El micrófono del menú, sincrónico dentro del toque (el link después navega a Contame):
   * escuchando → corta y pasa a la caja; la primera vez de la apertura → arranca el dictado web ("Te escucho");
   * después → la caja del teclado (con el teclado abierto desde el toque).
   */
  const { escuchando: oyendo, disponible, empezar, borrar } = dictado
  const tocarMenu = useCallback(() => {
    if (oyendo) {
      tomarTeclado()
      terminar()
      setPedidoTeclado('teclado')
      return
    }
    if (disponible) {
      borrar() // una grabación nueva
      empezar('menú')
      return
    }
    anotar(0, 'micrófono del menú: el dictado web ya se usó en esta apertura → teclado')
    tomarTeclado()
    if (ruta !== RUTA_CONTAME) borrar()
    setPedidoTeclado('teclado')
  }, [oyendo, disponible, empezar, borrar, terminar, ruta])

  const valor = useMemo(() => ({ ...dictado, pedidoTeclado, atenderTeclado, tocarMenu }), [dictado, pedidoTeclado, atenderTeclado, tocarMenu])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
