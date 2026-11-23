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
export const ERROR_RED = 'No pude escuchar. Revisá la conexión y probá de nuevo.'
const ERROR_SILENCIO = 'No te escuché por un rato. Tocá para hablar de nuevo.'
/** Safari corta tras unos segundos de silencio; más de esto seguido sin resultado se corta. */
const MAX_REINICIOS_SIN_RESULTADO = 5

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
  /** reinicios seguidos sin ningún resultado */
  const reinicios = useRef(0)

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
    // Cada handler ignora los eventos tardíos de un reconocedor que ya no es el actual (p. ej. tras "Grabar de nuevo").
    const actual = () => rec.current === r
    r.onresult = (e) => {
      if (!actual()) return
      reinicios.current = 0
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
      if (!actual()) return
      if (e.error === 'no-speech' || e.error === 'aborted') return // se reintenta solo
      // Cualquier otro error para: si no, cada onend reiniciaría para siempre mostrando "Te escucho…".
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') parar(ERROR_PERMISO)
      else if (e.error === 'audio-capture') parar(ERROR_MICROFONO)
      else parar(ERROR_RED)
    }
    r.onend = () => {
      if (!actual()) return
      setParcial('')
      if (!quiereEscuchar.current) return
      if (reinicios.current >= MAX_REINICIOS_SIN_RESULTADO) {
        parar(ERROR_SILENCIO)
        return
      }
      reinicios.current++
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
    const anterior = rec.current
    rec.current = r // desde acá el anterior queda ignorado
    try {
      anterior?.abort?.()
    } catch {
      /* ya estaba parado */
    }
    setError(undefined)
    reinicios.current = 0
    quiereEscuchar.current = true
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
