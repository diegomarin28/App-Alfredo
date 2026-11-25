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

/** Dónde se activa en el iPhone (ronda 8). */
export const ERROR_PERMISO = 'Falta el permiso del micrófono. Para activarlo: Ajustes → Apps → Safari → Micrófono → Permitir.'
const ERROR_MICROFONO = 'No encuentro el micrófono.'
export const ERROR_RED = 'No pude escuchar. Revisá la conexión y probá de nuevo.'
const ERROR_SILENCIO = 'No te escuché por un rato. Tocá para hablar de nuevo.'
/** Safari corta tras unos segundos de silencio; más de esto seguido sin resultado se corta. */
const MAX_REINICIOS_SIN_RESULTADO = 5

/**
 * Suelta un reconocedor del todo: sin handlers (sus eventos tardíos no llegan a nada) y con abort().
 * Ronda 8: en el iPhone, stop() muchas veces no termina nunca (no llega onend y sigue con el micrófono tomado), y
 * abort() después de stop() no hace nada. Si el próximo start() arranca con el anterior vivo, WebKit corta el
 * anterior y al soltar su audio deja sordo al nuevo: "Repetir" no volvía a escuchar. abort() lo corta en el momento.
 */
function soltar(r: Reconocedor | null) {
  if (!r) return
  r.onresult = null
  r.onerror = null
  r.onend = null
  try {
    if (r.abort) r.abort()
    else r.stop()
  } catch {
    /* ya estaba parado */
  }
}

/**
 * Dictado con reconocimiento de voz del navegador (portado del prototipo).
 * Safari corta solo después de un silencio: si no se tocó terminar, se reinicia y sigue acumulando.
 * Cada toque en "hablar" usa un reconocedor nuevo y arranca sincrónico dentro del toque (iOS lo exige).
 * El permiso lo maneja el navegador: no usamos getUserMedia, así que no hay un segundo pedido ni un stream abierto.
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
  const enVivo = useRef('')
  /** reinicios seguidos sin ningún resultado */
  const reinicios = useRef(0)

  /** Lo parcial que se está viendo pasa a lo acumulado (al terminar no se espera al resultado final). */
  const fijarParcial = useCallback(() => {
    const p = enVivo.current.trim()
    if (p) acumulado.current += (acumulado.current ? ' ' : '') + p
    enVivo.current = ''
    setFinal(acumulado.current)
    setParcial('')
  }, [])

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
    // Cada handler ignora los eventos de un reconocedor que ya no es el actual (por si el navegador los manda igual).
    const actual = () => rec.current === r
    r.onresult = (e) => {
      if (!actual()) return
      reinicios.current = 0
      let p = ''
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (!e.results[i].isFinal) p += t
        else if (i >= e.resultIndex) {
          const limpio = t.trim()
          if (limpio) acumulado.current += (acumulado.current ? ' ' : '') + limpio
        }
      }
      enVivo.current = p.trim()
      setFinal(acumulado.current)
      setParcial(enVivo.current)
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
      fijarParcial() // si cortó con algo sin confirmar, no se pierde
      if (!quiereEscuchar.current) return
      if (reinicios.current >= MAX_REINICIOS_SIN_RESULTADO) {
        parar(ERROR_SILENCIO)
        return
      }
      reinicios.current++
      try {
        r.start()
      } catch {
        soltar(r)
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
  }, [lang, parar, fijarParcial])

  // Sin await en el medio: en iOS el reconocimiento tiene que arrancar dentro del toque.
  const empezar = useCallback(() => {
    const anterior = rec.current
    rec.current = null
    soltar(anterior)
    const r = nuevo()
    if (!r) return
    rec.current = r
    enVivo.current = ''
    setParcial('')
    setError(undefined)
    reinicios.current = 0
    quiereEscuchar.current = true
    setEscuchando(true)
    try {
      r.start()
    } catch {
      rec.current = null
      soltar(r)
      parar('No pude empezar a escuchar, probá de nuevo.')
    }
  }, [nuevo, parar])

  const terminar = useCallback(() => {
    quiereEscuchar.current = false
    setEscuchando(false)
    const r = rec.current
    rec.current = null
    fijarParcial()
    soltar(r)
  }, [fijarParcial])

  const borrar = useCallback(() => {
    acumulado.current = ''
    enVivo.current = ''
    setFinal('')
    setParcial('')
  }, [])

  // Permiso denegado de antes: se avisa cómo activarlo sin esperar al toque (Safari 16+ lo informa).
  useEffect(() => {
    const permisos = typeof navigator !== 'undefined' ? navigator.permissions : undefined
    if (!permisos?.query) return
    let vivo = true
    let estado: PermissionStatus | null = null
    const revisar = () => {
      if (!vivo || !estado) return
      if (estado.state === 'denied') setError(ERROR_PERMISO)
      else setError((e) => (e === ERROR_PERMISO ? undefined : e))
    }
    permisos
      .query({ name: 'microphone' as PermissionName })
      .then((s) => {
        estado = s
        s.addEventListener?.('change', revisar)
        revisar()
      })
      .catch(() => {
        /* el navegador no lo informa */
      })
    return () => {
      vivo = false
      estado?.removeEventListener?.('change', revisar)
    }
  }, [])

  useEffect(() => () => {
    quiereEscuchar.current = false
    const r = rec.current
    rec.current = null
    soltar(r)
  }, [])

  const texto = [final, parcial].filter(Boolean).join(' ')
  return { soportado, escuchando, texto, empezar, terminar, borrar, ...(error ? { error } : {}) }
}
