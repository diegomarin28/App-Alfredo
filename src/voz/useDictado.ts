'use client'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { anotar } from './registro'

type ResultadosVoz = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>

/** Lo mínimo que usamos de SpeechRecognition (Safari lo expone como webkitSpeechRecognition). */
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ResultadosVoz }) => void) | null
  onerror: ((e: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  onstart?: (() => void) | null
  onaudiostart?: (() => void) | null
  onsoundstart?: (() => void) | null
  onspeechstart?: (() => void) | null
  onspeechend?: (() => void) | null
  onsoundend?: (() => void) | null
  onaudioend?: (() => void) | null
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

/**
 * Ronda 11 (registro del iPhone real): en la app instalada en iOS, el dictado web anda una sola vez por apertura
 * (ni otra instancia ni recargar la página lo arregla; solo cerrar la app). Se recuerda en memoria, no en
 * sessionStorage, que en esta apertura ya se usó: la próxima vez Contame va directo al dictado del teclado.
 * (Exportado también para las pruebas.)
 */
export const _apertura = { usado: false }

export interface Dictado {
  /** el navegador tiene reconocimiento de voz */
  soportado: boolean
  /** se puede usar el dictado web: soportado y todavía no se usó en esta apertura */
  disponible: boolean
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
export const ERROR_RED = 'No pude escuchar. Revisá la conexión y probá de nuevo.'
const ERROR_SILENCIO = 'No te escuché por un rato. Tocá para hablar de nuevo.'
/** Safari corta tras unos segundos de silencio; más de esto seguido sin resultado se corta. */
const MAX_REINICIOS_SIN_RESULTADO = 5

/** Sin audiostart en este tiempo, el dictado web no arrancó. */
export const ESPERA_AUDIO_MS = 2000
/** Mientras Safari puede estar mostrando el pedido de permiso, se espera más. */
export const ESPERA_PERMISO_MS = 20000
/** Sordo: el iPhone manda audiostart aunque no escuche; pasó esto sin speechstart ni result. */
export const ESPERA_SORDO_MS = 5000

let contador = 0
const numeros = new WeakMap<Reconocedor, number>()
const numero = (r: Reconocedor) => numeros.get(r) ?? 0
const nombreError = (e: unknown) => (e instanceof Error || e instanceof DOMException ? e.name : String(e))

/**
 * Dictado con reconocimiento de voz del navegador, una toma por apertura (ronda 11).
 * Arranca sincrónico dentro del toque (iOS lo exige). No usamos getUserMedia: el permiso lo maneja el navegador.
 * Safari corta solo después de un silencio: si no se tocó terminar, se reinicia y sigue acumulando.
 * Si queda sordo, no arranca o da error, se corta y avisa con `alFallar`: Contame pasa al dictado del teclado.
 * Los handlers nunca se sacan: todo lo que manda el reconocedor queda en el registro de diagnóstico.
 */
export function useDictado({ lang = 'es-UY', alFallar }: { lang?: string; alFallar?: (motivo: string) => void } = {}): Dictado {
  const soportado = useSyncExternalStore(nada, () => constructor() !== null, () => false)
  const [usado, setUsado] = useState(_apertura.usado)
  const [escuchando, setEscuchando] = useState(false)
  const [final, setFinal] = useState('')
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string>()

  /** lo decide el usuario, no el navegador; si es false, los errores (incluido el "aborted" de nuestro abort) solo se anotan */
  const quiereEscuchar = useRef(false)
  const rec = useRef<Reconocedor | null>(null)
  /** llegó "start" y llegó voz (speechstart o result) desde el último start() */
  const sesion = useRef({ start: false, voz: false })
  const huboAudio = useRef(false)
  const acumulado = useRef('')
  const enVivo = useRef('')
  /** reinicios seguidos sin ningún resultado */
  const reinicios = useRef(0)
  const permiso = useRef<PermissionState | undefined>(undefined)
  const relojes = useRef<{ audio?: ReturnType<typeof setTimeout>; sordo?: ReturnType<typeof setTimeout> }>({})
  const alFallarRef = useRef(alFallar)
  useEffect(() => {
    alFallarRef.current = alFallar
  }, [alFallar])

  const sinRelojes = useCallback(() => {
    for (const k of ['audio', 'sordo'] as const) {
      const t = relojes.current[k]
      if (t !== undefined) clearTimeout(t)
      relojes.current[k] = undefined
    }
  }, [])

  /** Lo parcial que se está viendo pasa a lo acumulado. */
  const fijarParcial = useCallback(() => {
    const p = enVivo.current.trim()
    if (p) acumulado.current += (acumulado.current ? ' ' : '') + p
    enVivo.current = ''
    setFinal(acumulado.current)
    setParcial('')
  }, [])

  /** El dictado web no anda: se corta (sin recargar) y Contame pasa al teclado. Lo dictado no se pierde. */
  const fallar = useCallback((motivo: string, mensaje?: string) => {
    if (!quiereEscuchar.current) return
    quiereEscuchar.current = false
    setEscuchando(false)
    sinRelojes()
    const r = rec.current
    anotar(0, `dictado web no anda: ${motivo} → teclado`)
    if (r) {
      anotar(numero(r), 'abort llamado')
      try {
        r.abort?.()
      } catch (e) {
        anotar(numero(r), `abort lanzó: ${nombreError(e)}`)
      }
    }
    fijarParcial()
    if (mensaje) setError(mensaje)
    alFallarRef.current?.(motivo)
  }, [fijarParcial, sinRelojes])

  /** Después de start(): si no llega audiostart a tiempo, no arrancó. */
  const vigilarAudio = useCallback((r: Reconocedor) => {
    const desde = Date.now()
    const revisar = () => {
      relojes.current.audio = undefined
      if (rec.current !== r || !quiereEscuchar.current) return
      // Safari puede estar mostrando el pedido de permiso: el evento "start" llega recién después de que se da.
      const puedePedirPermiso = !sesion.current.start && !huboAudio.current && permiso.current !== 'granted'
      if (puedePedirPermiso && Date.now() - desde < ESPERA_PERMISO_MS) {
        relojes.current.audio = setTimeout(revisar, 500)
        return
      }
      fallar(`sin audiostart en ${Date.now() - desde} ms`)
    }
    relojes.current.audio = setTimeout(revisar, ESPERA_AUDIO_MS)
  }, [fallar])

  /** start() con registro y vigía. Devuelve false si lanzó. */
  const arrancar = useCallback((r: Reconocedor): boolean => {
    anotar(numero(r), 'start llamado')
    sesion.current = { start: false, voz: false }
    try {
      r.start()
    } catch (e) {
      anotar(numero(r), `start lanzó: ${nombreError(e)}`)
      return false
    }
    vigilarAudio(r)
    return true
  }, [vigilarAudio])

  const huboVoz = useCallback(() => {
    sesion.current.voz = true
    const t = relojes.current.sordo
    if (t !== undefined) clearTimeout(t)
    relojes.current.sordo = undefined
  }, [])

  const crear = useCallback((): Reconocedor | null => {
    const SR = constructor()
    if (!SR) return null
    const r = new SR()
    numeros.set(r, ++contador)
    const n = numero(r)
    anotar(n, 'creado')
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    const actual = () => rec.current === r
    r.onstart = () => {
      anotar(n, 'start')
      if (actual()) sesion.current.start = true
    }
    r.onaudiostart = () => {
      anotar(n, 'audiostart')
      if (!actual() || !quiereEscuchar.current) return
      const t = relojes.current.audio
      if (t !== undefined) clearTimeout(t)
      relojes.current.audio = undefined
      huboAudio.current = true
      // el iPhone manda audiostart aunque esté sordo: si en 5 s no llega voz, al teclado
      if (!sesion.current.voz && relojes.current.sordo === undefined) {
        relojes.current.sordo = setTimeout(() => {
          relojes.current.sordo = undefined
          if (actual() && !sesion.current.voz) fallar(`sordo: ${ESPERA_SORDO_MS} ms desde audiostart sin speechstart ni result`)
        }, ESPERA_SORDO_MS)
      }
    }
    r.onsoundstart = () => anotar(n, 'soundstart')
    r.onspeechstart = () => {
      anotar(n, 'speechstart')
      if (actual()) huboVoz()
    }
    r.onspeechend = () => anotar(n, 'speechend')
    r.onsoundend = () => anotar(n, 'soundend')
    r.onaudioend = () => anotar(n, 'audioend')
    r.onresult = (e) => {
      let p = ''
      let finales = 0
      const nuevos: string[] = []
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (!e.results[i].isFinal) p += t
        else if (i >= e.resultIndex) {
          finales++
          const limpio = t.trim()
          if (limpio) nuevos.push(limpio)
        }
      }
      anotar(n, `result (${finales} final, ${p.trim().length} letras parciales)`)
      // también después de stop(): Safari manda el resultado final antes de su "end"
      if (!actual()) return
      huboVoz()
      reinicios.current = 0
      for (const t of nuevos) acumulado.current += (acumulado.current ? ' ' : '') + t
      enVivo.current = p.trim()
      setFinal(acumulado.current)
      setParcial(enVivo.current)
    }
    r.onerror = (e) => {
      anotar(n, `error ${e.error}${e.message ? `: ${e.message}` : ''}`)
      // ya cortado (por Alfredo o por nosotros): solo se anota. Antes el "aborted" de nuestro abort disparaba otra recarga.
      if (!actual() || !quiereEscuchar.current) return
      if (e.error === 'no-speech') return // silencio: onend reinicia solo
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') fallar(`error ${e.error}`, ERROR_PERMISO)
      else if (e.error === 'network' && typeof navigator !== 'undefined' && navigator.onLine === false) fallar('error network sin conexión', ERROR_RED)
      else fallar(`error ${e.error}`)
    }
    r.onend = () => {
      anotar(n, 'end')
      if (!actual()) return
      fijarParcial() // si cortó con algo sin confirmar, no se pierde
      if (!quiereEscuchar.current) return
      if (reinicios.current >= MAX_REINICIOS_SIN_RESULTADO) {
        quiereEscuchar.current = false
        sinRelojes()
        setEscuchando(false)
        setError(ERROR_SILENCIO)
        return
      }
      reinicios.current++
      if (!arrancar(r)) fallar('no pude reiniciar')
    }
    return r
  }, [lang, fijarParcial, arrancar, fallar, huboVoz, sinRelojes])

  // Sin await en el medio: en iOS el reconocimiento tiene que arrancar dentro del toque.
  const empezar = useCallback(() => {
    if (_apertura.usado || quiereEscuchar.current) {
      anotar(0, 'grabar ignorado: el dictado web ya se usó en esta apertura')
      return
    }
    const r = crear()
    if (!r) return
    rec.current = r
    _apertura.usado = true
    setUsado(true)
    enVivo.current = ''
    setParcial('')
    setError(undefined)
    reinicios.current = 0
    quiereEscuchar.current = true
    setEscuchando(true)
    if (!arrancar(r)) fallar('start lanzó')
  }, [crear, arrancar, fallar])

  /** Alfredo cortó: stop() para que Safari mande lo último (su resultado final llega antes del "end"). */
  const terminar = useCallback(() => {
    if (!quiereEscuchar.current) return
    quiereEscuchar.current = false
    setEscuchando(false)
    sinRelojes()
    const r = rec.current
    if (!r) return
    anotar(numero(r), 'stop llamado')
    try {
      r.stop()
    } catch (e) {
      anotar(numero(r), `stop lanzó: ${nombreError(e)}`)
      fijarParcial()
    }
  }, [sinRelojes, fijarParcial])

  const borrar = useCallback(() => {
    acumulado.current = ''
    enVivo.current = ''
    setFinal('')
    setParcial('')
  }, [])

  useEffect(() => {
    anotar(0, `Contame abierto${_apertura.usado ? ' (el dictado web ya se usó en esta apertura)' : ''}`)
  }, [])

  // Permiso denegado de antes: se avisa cómo activarlo sin esperar al toque (Safari 16+ lo informa).
  useEffect(() => {
    const permisos = typeof navigator !== 'undefined' ? navigator.permissions : undefined
    if (!permisos?.query) return
    let vigente = true
    let estado: PermissionStatus | null = null
    const revisar = () => {
      if (!vigente || !estado) return
      permiso.current = estado.state
      if (estado.state === 'denied') setError(ERROR_PERMISO)
      else setError((e) => (e === ERROR_PERMISO ? undefined : e))
    }
    permisos
      .query({ name: 'microphone' as PermissionName })
      .then((s) => {
        estado = s
        anotar(0, `permiso del micrófono: ${s.state}`)
        s.addEventListener?.('change', revisar)
        revisar()
      })
      .catch(() => {
        /* el navegador no lo informa */
      })
    return () => {
      vigente = false
      estado?.removeEventListener?.('change', revisar)
    }
  }, [])

  // Al salir de Contame: se corta (los handlers quedan; lo que llegue se anota y nada más).
  useEffect(() => {
    const r0 = relojes.current
    return () => {
      for (const t of Object.values(r0)) if (t !== undefined) clearTimeout(t)
      const r = rec.current
      if (r && quiereEscuchar.current) {
        quiereEscuchar.current = false
        anotar(numero(r), 'abort llamado (salí de Contame)')
        try {
          r.abort?.()
        } catch {
          /* nada */
        }
      }
    }
  }, [])

  const texto = [final, parcial].filter(Boolean).join(' ')
  return { soportado, disponible: soportado && !usado, escuchando, texto, empezar, terminar, borrar, ...(error ? { error } : {}) }
}
