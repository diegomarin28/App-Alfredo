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

export interface Dictado {
  soportado: boolean
  escuchando: boolean
  /** lo final acumulado + lo parcial en vivo */
  texto: string
  empezar(): void
  terminar(): void
  borrar(): void
  error?: string
  /** ronda 9: se recargó la página para reiniciar el motor de voz; el texto volvió y falta un toque */
  recuperado: boolean
}

/** Dónde se activa en el iPhone (ronda 8). */
export const ERROR_PERMISO = 'Falta el permiso del micrófono. Para activarlo: Ajustes → Apps → Safari → Micrófono → Permitir.'
export const ERROR_RED = 'No pude escuchar. Revisá la conexión y probá de nuevo.'
const ERROR_SILENCIO = 'No te escuché por un rato. Tocá para hablar de nuevo.'
/** Ni recargando anduvo: que nunca quede tocando sin que pase nada. */
export const ERROR_TRABADO = 'El micrófono no responde. Cerrá la app del todo y volvé a abrirla, o tocá «Prefiero escribir».'
/** Safari corta tras unos segundos de silencio; más de esto seguido sin resultado se corta. */
const MAX_REINICIOS_SIN_RESULTADO = 5

/** Plan B (ronda 9): sin audiostart en este tiempo, el motor de voz de Safari está trabado. */
export const ESPERA_AUDIO_MS = 2000
/** Mientras Safari puede estar mostrando el pedido de permiso, se espera más. */
export const ESPERA_PERMISO_MS = 20000
/** Recargas seguidas sin que llegue audio; después de esto se avisa en vez de recargar otra vez. */
const MAX_RECARGAS = 2

export const CLAVE_RECUPERAR = 'alfredo:dictado:recuperar'
const CLAVE_RECARGAS = 'alfredo:dictado:recargas'
/**
 * Llegó audio alguna vez en esta carga de la página: el permiso ya está dado y no hay pedido que esperar.
 * (Exportado solo para las pruebas.)
 */
export const _pagina = { huboAudio: false }

function leer(almacen: 'session', clave: string): string | null {
  try {
    return sessionStorage.getItem(clave)
  } catch {
    return null
  }
}
function escribir(almacen: 'session', clave: string, valor: string | null): boolean {
  try {
    const s = sessionStorage
    if (valor === null) s.removeItem(clave)
    else s.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

let contador = 0
const numeros = new WeakMap<Reconocedor, number>()
const numero = (r: Reconocedor) => numeros.get(r) ?? 0
/** Si llegó el evento "start" desde el último start() (antes de eso Safari puede estar pidiendo permiso). */
const empezados = new WeakMap<Reconocedor, boolean>()

/**
 * Suelta un reconocedor del todo: sin handlers (sus eventos tardíos no llegan a nada) y con abort().
 * Ronda 8: en el iPhone, stop() muchas veces no termina nunca y abort() después de stop() no hace nada; si el
 * próximo start() arranca con el anterior vivo, queda sordo. abort() lo corta en el momento.
 */
function soltar(r: Reconocedor | null) {
  if (!r) return
  r.onresult = null
  r.onerror = null
  r.onend = null
  r.onstart = null
  r.onaudiostart = null
  r.onsoundstart = null
  r.onspeechstart = null
  r.onspeechend = null
  r.onsoundend = null
  r.onaudioend = null
  try {
    if (r.abort) {
      anotar(numero(r), 'abort llamado')
      r.abort()
    } else {
      anotar(numero(r), 'stop llamado')
      r.stop()
    }
  } catch (e) {
    anotar(numero(r), `abort falló: ${e instanceof Error ? e.name : String(e)}`)
  }
}

const recargarPagina = () => window.location.reload()

/**
 * Dictado con reconocimiento de voz del navegador (portado del prototipo).
 * Safari corta solo después de un silencio: si no se tocó terminar, se reinicia y sigue acumulando.
 * Cada toque en "hablar" usa un reconocedor nuevo y arranca sincrónico dentro del toque (iOS lo exige).
 * El permiso lo maneja el navegador: no usamos getUserMedia, así que no hay un segundo pedido ni un stream abierto.
 *
 * Plan B (ronda 9): si después de start() no llega audiostart en 2 s, o llega un error, el motor de voz de Safari
 * quedó trabado y solo se arregla recargando. Se guarda lo dictado en sessionStorage, se recarga, y al volver el
 * texto está y se pide un toque más (iOS no deja arrancar el micrófono sin un toque).
 */
export function useDictado({ lang = 'es-UY', recargar = recargarPagina }: { lang?: string; recargar?: () => void } = {}): Dictado {
  const soportado = useSyncExternalStore(nada, () => constructor() !== null, () => false)
  const [escuchando, setEscuchando] = useState(false)
  const [final, setFinal] = useState('')
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string>()
  const [recuperado, setRecuperado] = useState(false)

  const quiereEscuchar = useRef(false) // lo decide el usuario, no el navegador
  const rec = useRef<Reconocedor | null>(null)
  const acumulado = useRef('')
  const enVivo = useRef('')
  /** reinicios seguidos sin ningún resultado */
  const reinicios = useRef(0)
  const permiso = useRef<PermissionState | undefined>(undefined)
  const vigia = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const recargando = useRef(false)
  const recargarRef = useRef(recargar)
  useEffect(() => {
    recargarRef.current = recargar
  }, [recargar])

  const sinVigia = useCallback(() => {
    if (vigia.current !== undefined) clearTimeout(vigia.current)
    vigia.current = undefined
  }, [])

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

  /** Plan B: guarda lo dictado y recarga Contame para reiniciar el motor de voz de Safari. */
  const recuperar = useCallback((motivo: string) => {
    if (recargando.current) return
    sinVigia()
    const r = rec.current
    rec.current = null
    soltar(r)
    fijarParcial()
    quiereEscuchar.current = false
    const recargas = Number(leer('session', CLAVE_RECARGAS) ?? '0') + 1
    anotar(0, `plan B: ${motivo} (recarga ${recargas})`)
    if (recargas > MAX_RECARGAS) {
      escribir('session', CLAVE_RECARGAS, null) // el próximo toque vuelve a probar con una recarga
      parar(ERROR_TRABADO)
      return
    }
    const guardado = escribir('session', CLAVE_RECUPERAR, JSON.stringify({ texto: acumulado.current }))
    if (!guardado && acumulado.current) {
      parar(ERROR_TRABADO) // recargar sin poder guardar perdería lo dictado
      return
    }
    escribir('session', CLAVE_RECARGAS, String(recargas))
    recargando.current = true
    setEscuchando(false)
    anotar(0, 'recargando la página')
    recargarRef.current()
  }, [fijarParcial, parar, sinVigia])

  /** Después de start(): si no llega audiostart a tiempo, plan B. */
  const vigilar = useCallback((r: Reconocedor) => {
    sinVigia()
    const desde = Date.now()
    const revisar = () => {
      vigia.current = undefined
      if (rec.current !== r) return
      // Safari puede estar mostrando el pedido de permiso: el evento "start" llega recién después de que se da.
      const puedePedirPermiso = !empezados.get(r) && !_pagina.huboAudio && permiso.current !== 'granted'
      if (puedePedirPermiso && Date.now() - desde < ESPERA_PERMISO_MS) {
        vigia.current = setTimeout(revisar, 500)
        return
      }
      recuperar(`sin audiostart en ${Date.now() - desde} ms`)
    }
    vigia.current = setTimeout(revisar, ESPERA_AUDIO_MS)
  }, [recuperar, sinVigia])

  /** start() con registro y vigía. Devuelve false si lanzó. */
  const arrancar = useCallback((r: Reconocedor): boolean => {
    anotar(numero(r), 'start llamado')
    empezados.set(r, false)
    try {
      r.start()
    } catch (e) {
      anotar(numero(r), `start lanzó: ${e instanceof Error ? e.name : String(e)}`)
      return false
    }
    vigilar(r)
    return true
  }, [vigilar])

  const nuevo = useCallback((): Reconocedor | null => {
    const SR = constructor()
    if (!SR) return null
    const r = new SR()
    numeros.set(r, ++contador)
    anotar(numero(r), 'creado')
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    const n = numero(r)
    // Cada handler ignora los eventos de un reconocedor que ya no es el actual (por si el navegador los manda igual).
    const actual = () => rec.current === r
    r.onstart = () => {
      anotar(n, 'start')
      empezados.set(r, true)
    }
    r.onaudiostart = () => {
      anotar(n, 'audiostart')
      if (!actual()) return
      sinVigia()
      _pagina.huboAudio = true
      escribir('session', CLAVE_RECARGAS, null)
    }
    r.onsoundstart = () => anotar(n, 'soundstart')
    r.onspeechstart = () => anotar(n, 'speechstart')
    r.onspeechend = () => anotar(n, 'speechend')
    r.onsoundend = () => anotar(n, 'soundend')
    r.onaudioend = () => anotar(n, 'audioend')
    r.onresult = (e) => {
      if (!actual()) return
      reinicios.current = 0
      let p = ''
      let finales = 0
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (!e.results[i].isFinal) p += t
        else if (i >= e.resultIndex) {
          finales++
          const limpio = t.trim()
          if (limpio) acumulado.current += (acumulado.current ? ' ' : '') + limpio
        }
      }
      anotar(n, `result (${finales} final, ${p.trim().length} letras parciales)`)
      enVivo.current = p.trim()
      setFinal(acumulado.current)
      setParcial(enVivo.current)
    }
    r.onerror = (e) => {
      anotar(n, `error ${e.error}${e.message ? `: ${e.message}` : ''}`)
      if (!actual()) return
      if (e.error === 'no-speech') return // silencio: onend reinicia solo
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // recargar no lo arregla: se explica cómo activarlo
        sinVigia()
        parar(ERROR_PERMISO)
        return
      }
      if (e.error === 'network' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        sinVigia()
        parar(ERROR_RED) // sin conexión, recargar mostraría la página de error de Safari
        return
      }
      recuperar(`error ${e.error}`)
    }
    r.onend = () => {
      anotar(n, 'end')
      if (!actual()) return
      sinVigia()
      fijarParcial() // si cortó con algo sin confirmar, no se pierde
      if (!quiereEscuchar.current) return
      if (reinicios.current >= MAX_REINICIOS_SIN_RESULTADO) {
        parar(ERROR_SILENCIO)
        return
      }
      reinicios.current++
      if (arrancar(r)) return
      soltar(r)
      const otro = nuevo()
      rec.current = otro
      if (!otro || !arrancar(otro)) recuperar('no pude reiniciar')
    }
    return r
  }, [lang, parar, fijarParcial, recuperar, arrancar, sinVigia])

  // Sin await en el medio: en iOS el reconocimiento tiene que arrancar dentro del toque.
  const empezar = useCallback(() => {
    if (recargando.current) return
    const anterior = rec.current
    rec.current = null
    soltar(anterior)
    const r = nuevo()
    if (!r) return
    rec.current = r
    enVivo.current = ''
    setParcial('')
    setError(undefined)
    setRecuperado(false)
    reinicios.current = 0
    quiereEscuchar.current = true
    setEscuchando(true)
    if (!arrancar(r)) recuperar('start lanzó')
  }, [nuevo, arrancar, recuperar])

  const terminar = useCallback(() => {
    sinVigia()
    quiereEscuchar.current = false
    setEscuchando(false)
    const r = rec.current
    rec.current = null
    fijarParcial()
    soltar(r)
  }, [fijarParcial, sinVigia])

  const borrar = useCallback(() => {
    acumulado.current = ''
    enVivo.current = ''
    setFinal('')
    setParcial('')
  }, [])

  // Al volver de la recarga del plan B: el texto guardado vuelve y falta un toque.
  useEffect(() => {
    const crudo = leer('session', CLAVE_RECUPERAR)
    anotar(0, crudo ? 'Contame abierto (después de recargar)' : 'Contame abierto')
    if (!crudo) return
    escribir('session', CLAVE_RECUPERAR, null)
    let texto = ''
    try {
      const v: unknown = JSON.parse(crudo)
      if (v && typeof v === 'object' && typeof (v as { texto?: unknown }).texto === 'string') texto = (v as { texto: string }).texto
    } catch {
      /* guardado roto: se sigue sin texto */
    }
    acumulado.current = texto
    setFinal(texto)
    setRecuperado(true)
  }, [])

  // Permiso denegado de antes: se avisa cómo activarlo sin esperar al toque (Safari 16+ lo informa).
  useEffect(() => {
    const permisos = typeof navigator !== 'undefined' ? navigator.permissions : undefined
    if (!permisos?.query) return
    let vivo = true
    let estado: PermissionStatus | null = null
    const revisar = () => {
      if (!vivo || !estado) return
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
      vivo = false
      estado?.removeEventListener?.('change', revisar)
    }
  }, [])

  useEffect(() => () => {
    if (vigia.current !== undefined) clearTimeout(vigia.current)
    quiereEscuchar.current = false
    const r = rec.current
    rec.current = null
    soltar(r)
  }, [])

  const texto = [final, parcial].filter(Boolean).join(' ')
  return { soportado, escuchando, texto, empezar, terminar, borrar, recuperado, ...(error ? { error } : {}) }
}
