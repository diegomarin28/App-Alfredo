'use client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Lo mínimo que usamos de SpeechRecognition (Safari lo expone como webkitSpeechRecognition). */
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort?(): void
}
type ConstructorReconocedor = new () => Reconocedor

function constructor(): ConstructorReconocedor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocedor; webkitSpeechRecognition?: ConstructorReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const nada = () => () => {}

export interface Dictado {
  soportado: boolean
  escuchando: boolean
  /** lo final acumulado + lo parcial en vivo */
  texto: string
  empezar(): void
  terminar(): void
  borrar(): void
  error?: string
}

export const ERROR_PERMISO = 'Falta el permiso del micrófono'
const ERROR_MICROFONO = 'No encuentro el micrófono.'

/**
 * Dictado con reconocimiento de voz del navegador (portado del prototipo).
 * Safari corta solo después de un silencio: si no se tocó terminar, se reinicia y sigue acumulando.
 */
export function useDictado({ lang = 'es-UY' }: { lang?: string } = {}): Dictado {
  const soportado = useSyncExternalStore(nada, () => constructor() !== null, () => false)
  const [escuchando, setEscuchando] = useState(false)
  const [final, setFinal] = useState('')
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string>()

  const quiereEscuchar = useRef(false) // lo decide el usuario, no el navegador
  const rec = useRef<Reconocedor | null>(null)
  const acumulado = useRef('')

  const parar = useCallback((mensaje?: string) => {
    quiereEscuchar.current = false
    setEscuchando(false)
    if (mensaje) setError(mensaje)
  }, [])

  const nuevo = useCallback((): Reconocedor | null => {
    const SR = constructor()
    if (!SR) return null
    const r = new SR()
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let p = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          const limpio = t.trim()
          if (limpio) acumulado.current += (acumulado.current ? ' ' : '') + limpio
        } else p += t
      }
      setFinal(acumulado.current)
      setParcial(p.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return // se reintenta solo
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') parar(ERROR_PERMISO)
      else if (e.error === 'audio-capture') parar(ERROR_MICROFONO)
    }
    r.onend = () => {
      setParcial('')
      if (!quiereEscuchar.current || rec.current !== r) return
      try {
        r.start()
      } catch {
        const otro = nuevo()
        rec.current = otro
        try {
          otro?.start()
        } catch {
          parar('No pude seguir escuchando, tocá de nuevo.')
        }
      }
    }
    return r
  }, [lang, parar])

  const empezar = useCallback(() => {
    const r = nuevo()
    if (!r) return
    setError(undefined)
    quiereEscuchar.current = true
    rec.current = r
    setEscuchando(true)
    try {
      r.start()
    } catch {
      parar('No pude empezar a escuchar, probá de nuevo.')
    }
  }, [nuevo, parar])

  const terminar = useCallback(() => {
    quiereEscuchar.current = false
    setEscuchando(false)
    try {
      rec.current?.stop()
    } catch {
      /* ya estaba parado */
    }
  }, [])

  const borrar = useCallback(() => {
    acumulado.current = ''
    setFinal('')
    setParcial('')
  }, [])

  useEffect(() => () => {
    quiereEscuchar.current = false
    try {
      rec.current?.abort?.()
    } catch {
      /* nada */
    }
  }, [])

  const texto = [final, parcial].filter(Boolean).join(' ')
  return { soportado, escuchando, texto, empezar, terminar, borrar, ...(error ? { error } : {}) }
}
