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
  /** ronda 10: el reconocedor anterior todavía no terminó; grabar/Repetir esperan ("Un momento…") */
  ocupado: boolean
  /** lo final acumulado + lo parcial en vivo */
  texto: string
  empezar(): void
  terminar(): void
  borrar(): void
  error?: string
  /** ronda 9: se recargó la página para reiniciar el motor de voz; el texto volvió y falta un toque */
  recuperado: boolean
}

/**
 * Ronda 10: cómo se graba de nuevo. 'reusar': siempre la misma instancia, start() después de su "end" (en iOS
 * hay reportes de que las instancias nuevas quedan sordas). 'nueva': una instancia nueva por grabación.
 */
export type Estrategia = 'reusar' | 'nueva'
export const ESTRATEGIA: Estrategia = 'reusar'

/** Dónde se activa en el iPhone (ronda 8). */
export const ERROR_PERMISO = 'Falta el permiso del micrófono. Para activarlo: Ajustes → Apps → Safari → Micrófono → Permitir.'
export const ERROR_RED = 'No pude escuchar. Revisá la conexión y probá de nuevo.'
const ERROR_SILENCIO = 'No te escuché por un rato. Tocá para hablar de nuevo.'
/** Ni recargando anduvo: que nunca quede tocando sin que pase nada. */
export const ERROR_TRABADO = 'El micrófono no responde. Cerrá la app del todo y volvé a abrirla, o tocá «Prefiero escribir».'
/** Safari corta tras unos segundos de silencio; más de esto seguido sin resultado se corta. */
const MAX_REINICIOS_SIN_RESULTADO = 5

/** Al cortar: stop() y se espera "end"; si no llega, abort() y se espera otra vez; después se libera igual. */
export const ESPERA_STOP_MS = 1500
export const ESPERA_ABORT_MS = 1500
/** Plan B: sin audiostart en este tiempo, el motor de voz no arrancó. */
export const ESPERA_AUDIO_MS = 2000
/** Mientras Safari puede estar mostrando el pedido de permiso, se espera más. */
export const ESPERA_PERMISO_MS = 20000
/**
 * Plan B (ronda 10): el iPhone manda audiostart aunque esté sordo. Sordo es: pasó esto desde audiostart sin
 * ningún speechstart ni result.
 */
export const ESPERA_SORDO_MS = 5000
/** Recargas seguidas sin que llegue nada; después de esto se avisa en vez de recargar otra vez. */
const MAX_RECARGAS = 2

export const CLAVE_RECUPERAR = 'alfredo:dictado:recuperar'
const CLAVE_RECARGAS = 'alfredo:dictado:recargas'

/**
 * Llegó audio alguna vez en esta carga de la página: el permiso ya está dado y no hay pedido que esperar.
 * (Exportado solo para las pruebas.)
 */
export const _pagina = { huboAudio: false }

function leer(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave)
  } catch {
    return null
  }
}
function escribir(clave: string, valor: string | null): boolean {
  try {
    if (valor === null) sessionStorage.removeItem(clave)
    else sessionStorage.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

let contador = 0
const numeros = new WeakMap<Reconocedor, number>()
const numero = (r: Reconocedor) => numeros.get(r) ?? 0

const recargarPagina = () => window.location.reload()
const nombreError = (e: unknown) => (e instanceof Error || e instanceof DOMException ? e.name : String(e))

/**
 * Dictado con reconocimiento de voz del navegador (portado del prototipo).
 * Safari corta solo después de un silencio: si no se tocó terminar, se reinicia y sigue acumulando.
 * Arranca sincrónico dentro del toque (iOS lo exige). No usamos getUserMedia: el permiso lo maneja el navegador.
 *
 * Ronda 10 (con el registro del iPhone real): el reconocedor anterior no soltaba el audio y los nuevos quedaban
 * sordos (start y audiostart, nunca speechstart ni result). Ahora: los handlers nunca se sacan (todo queda en el
 * registro); al cortar se espera el "end" del anterior (stop, y abort si no llega) antes de dejar grabar de nuevo;
 * y por defecto se reusa la misma instancia.
 *
 * Plan B: si la toma queda sorda (5 s desde audiostart sin speechstart ni result, o se cortó sin ningún result),
 * no arrancó (sin audiostart) o llega un error, se guarda lo dictado en sessionStorage y se recarga Contame para
 * reiniciar el motor de voz de Safari. Al volver, el texto está y se pide un toque (iOS no arranca sin un toque).
 */
export function useDictado({ lang = 'es-UY', recargar = recargarPagina, estrategia = ESTRATEGIA }: {
  lang?: string; recargar?: () => void; estrategia?: Estrategia
} = {}): Dictado {
  const soportado = useSyncExternalStore(nada, () => constructor() !== null, () => false)
  const [escuchando, setEscuchando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [final, setFinal] = useState('')
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string>()
  const [recuperado, setRecuperado] = useState(false)

  const quiereEscuchar = useRef(false) // lo decide el usuario, no el navegador
  /** el reconocedor de esta pantalla (con 'reusar', siempre el mismo) */
  const rec = useRef<Reconocedor | null>(null)
  /** entre start() y su "end" */
  const vivo = useRef(false)
  /** se cortó y se espera su "end" */
  const cerrando = useRef(false)
  /** se tocó grabar (toma), llegó voz (speechstart o result) y llegó "start" desde el último start() */
  const hubo = useRef({ toma: false, voz: false, start: false })
  const acumulado = useRef('')
  const enVivo = useRef('')
  /** reinicios seguidos sin ningún resultado */
  const reinicios = useRef(0)
  const permiso = useRef<PermissionState | undefined>(undefined)
  const relojes = useRef<{ audio?: ReturnType<typeof setTimeout>; sordo?: ReturnType<typeof setTimeout>; cierre?: ReturnType<typeof setTimeout> }>({})
  const recargando = useRef(false)
  const recargarRef = useRef(recargar)
  useEffect(() => {
    recargarRef.current = recargar
  }, [recargar])

  const sinReloj = useCallback((cual: 'audio' | 'sordo' | 'cierre') => {
    const t = relojes.current[cual]
    if (t !== undefined) clearTimeout(t)
    relojes.current[cual] = undefined
  }, [])
  const sinRelojes = useCallback(() => {
    sinReloj('audio')
    sinReloj('sordo')
    sinReloj('cierre')
  }, [sinReloj])

  /** Lo parcial que se está viendo pasa a lo acumulado. */
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

  const liberado = useCallback(() => {
    sinReloj('cierre')
    cerrando.current = false
    setOcupado(false)
  }, [sinReloj])

  /** Plan B: guarda lo dictado y recarga Contame para reiniciar el motor de voz de Safari. */
  const recuperar = useCallback((motivo: string) => {
    if (recargando.current) return
    sinRelojes()
    quiereEscuchar.current = false
    const r = rec.current
    if (r && vivo.current) {
      anotar(numero(r), 'abort llamado (plan B)')
      try {
        r.abort?.()
      } catch (e) {
        anotar(numero(r), `abort lanzó: ${nombreError(e)}`)
      }
    }
    fijarParcial()
    const recargas = Number(leer(CLAVE_RECARGAS) ?? '0') + 1
    anotar(0, `plan B: ${motivo} (recarga ${recargas})`)
    if (recargas > MAX_RECARGAS) {
      escribir(CLAVE_RECARGAS, null) // el próximo toque vuelve a probar con una recarga
      liberado()
      parar(ERROR_TRABADO)
      return
    }
    const guardado = escribir(CLAVE_RECUPERAR, JSON.stringify({ texto: acumulado.current }))
    if (!guardado && acumulado.current) {
      liberado()
      parar(ERROR_TRABADO) // recargar sin poder guardar perdería lo dictado
      return
    }
    escribir(CLAVE_RECARGAS, String(recargas))
    recargando.current = true
    setEscuchando(false)
    anotar(0, 'recargando la página')
    recargarRef.current()
  }, [fijarParcial, parar, sinRelojes, liberado])

  /** Llegó voz de verdad (speechstart o result): la toma no está sorda. */
  const huboVoz = useCallback(() => {
    if (hubo.current.voz) return
    hubo.current.voz = true
    sinReloj('sordo')
    escribir(CLAVE_RECARGAS, null)
  }, [sinReloj])

  /** Después de start(): si no llega audiostart a tiempo, el motor no arrancó. */
  const vigilarAudio = useCallback((r: Reconocedor) => {
    sinReloj('audio')
    const desde = Date.now()
    const revisar = () => {
      relojes.current.audio = undefined
      if (rec.current !== r || !vivo.current) return
      // Safari puede estar mostrando el pedido de permiso: el evento "start" llega recién después de que se da.
      const puedePedirPermiso = !hubo.current.start && !_pagina.huboAudio && permiso.current !== 'granted'
      if (puedePedirPermiso && Date.now() - desde < ESPERA_PERMISO_MS) {
        relojes.current.audio = setTimeout(revisar, 500)
        return
      }
      recuperar(`sin audiostart en ${Date.now() - desde} ms`)
    }
    relojes.current.audio = setTimeout(revisar, ESPERA_AUDIO_MS)
  }, [recuperar, sinReloj])

  /** start() con registro y vigía. Devuelve false si lanzó. */
  const arrancar = useCallback((r: Reconocedor): boolean => {
    anotar(numero(r), 'start llamado')
    hubo.current.start = false
    try {
      r.start()
    } catch (e) {
      anotar(numero(r), `start lanzó: ${nombreError(e)}`)
      return false
    }
    vivo.current = true
    vigilarAudio(r)
    return true
  }, [vigilarAudio])

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
    // Los handlers no se sacan nunca: aunque ya se haya cortado, su end y su error quedan en el registro.
    // Solo el reconocedor actual cambia el estado.
    const actual = () => rec.current === r
    r.onstart = () => {
      anotar(n, 'start')
      if (actual()) hubo.current.start = true
    }
    r.onaudiostart = () => {
      anotar(n, 'audiostart')
      if (!actual() || !vivo.current) return
      sinReloj('audio')
      _pagina.huboAudio = true
      // el iPhone manda audiostart aunque esté sordo: si en 5 s no llega voz, plan B
      if (hubo.current.toma && !hubo.current.voz && quiereEscuchar.current && relojes.current.sordo === undefined) {
        relojes.current.sordo = setTimeout(() => {
          relojes.current.sordo = undefined
          if (actual() && !hubo.current.voz && quiereEscuchar.current) recuperar(`sordo: ${ESPERA_SORDO_MS} ms desde audiostart sin speechstart ni result`)
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
      if (!actual()) return
      if (cerrando.current || recargando.current) return // se está cortando: llega su "end"
      if (e.error === 'no-speech') return // silencio: onend reinicia solo
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        sinRelojes() // recargar no lo arregla: se explica cómo activarlo
        parar(ERROR_PERMISO)
        return
      }
      if (e.error === 'network' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        sinRelojes()
        parar(ERROR_RED) // sin conexión, recargar mostraría la página de error de Safari
        return
      }
      recuperar(`error ${e.error}`)
    }
    r.onend = () => {
      anotar(n, 'end')
      if (!actual()) return
      vivo.current = false
      sinReloj('audio')
      fijarParcial() // si cortó con algo sin confirmar, no se pierde
      if (cerrando.current) {
        anotar(n, 'terminó: se puede grabar de nuevo')
        liberado()
        return
      }
      if (!quiereEscuchar.current || recargando.current) return
      if (reinicios.current >= MAX_REINICIOS_SIN_RESULTADO) {
        sinRelojes()
        parar(ERROR_SILENCIO)
        return
      }
      reinicios.current++
      if (arrancar(r)) return
      // no se pudo reiniciar la misma: una nueva (la anterior ya terminó)
      const otro = crear()
      rec.current = otro
      if (!otro || !arrancar(otro)) recuperar('no pude reiniciar')
    }
    return r
  }, [lang, parar, fijarParcial, recuperar, arrancar, sinReloj, sinRelojes, huboVoz, liberado])

  // Sin await en el medio: en iOS el reconocimiento tiene que arrancar dentro del toque.
  const empezar = useCallback(() => {
    if (recargando.current) return
    if (cerrando.current) {
      anotar(0, 'grabar ignorado: el anterior todavía no terminó')
      return
    }
    let r = rec.current
    if (estrategia === 'nueva' || !r) {
      r = crear()
      if (!r) return
      rec.current = r
    } else {
      anotar(numero(r), 'reuso la misma instancia')
    }
    enVivo.current = ''
    setParcial('')
    setError(undefined)
    setRecuperado(false)
    reinicios.current = 0
    hubo.current = { toma: true, voz: false, start: false }
    quiereEscuchar.current = true
    setEscuchando(true)
    if (!arrancar(r)) recuperar('start lanzó')
  }, [estrategia, crear, arrancar, recuperar])

  /** Corta: stop() y espera su "end"; si no llega en 1,5 s, abort() y espera otra vez; después se libera igual. */
  const cortar = useCallback((r: Reconocedor) => {
    cerrando.current = true
    setOcupado(true)
    const n = numero(r)
    anotar(n, 'stop llamado')
    try {
      r.stop()
    } catch (e) {
      anotar(n, `stop lanzó: ${nombreError(e)}`)
    }
    if (!cerrando.current) return // el end llegó en el momento
    relojes.current.cierre = setTimeout(() => {
      if (!cerrando.current) return
      anotar(n, `end no llegó en ${ESPERA_STOP_MS} ms: abort llamado`)
      try {
        r.abort?.()
      } catch (e) {
        anotar(n, `abort lanzó: ${nombreError(e)}`)
      }
      if (!cerrando.current) return
      relojes.current.cierre = setTimeout(() => {
        if (!cerrando.current) return
        anotar(n, `end no llegó tampoco después de abort (${ESPERA_ABORT_MS} ms): se libera igual`)
        fijarParcial()
        liberado()
      }, ESPERA_ABORT_MS)
    }, ESPERA_STOP_MS)
  }, [fijarParcial, liberado])

  const terminar = useCallback(() => {
    sinReloj('audio')
    sinReloj('sordo')
    quiereEscuchar.current = false
    setEscuchando(false)
    // cortó sin que llegara ningún result: el micrófono estaba sordo
    if (hubo.current.toma && !hubo.current.voz) {
      recuperar('cortó la grabación sin ningún result')
      return
    }
    const r = rec.current
    if (r && vivo.current && !cerrando.current) cortar(r)
  }, [cortar, recuperar, sinReloj])

  const borrar = useCallback(() => {
    acumulado.current = ''
    enVivo.current = ''
    setFinal('')
    setParcial('')
  }, [])

  // Al volver de la recarga del plan B: el texto guardado vuelve y falta un toque.
  useEffect(() => {
    const crudo = leer(CLAVE_RECUPERAR)
    anotar(0, crudo ? 'Contame abierto (después de recargar)' : 'Contame abierto')
    if (!crudo) return
    escribir(CLAVE_RECUPERAR, null)
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

  // Al salir de Contame: se corta (los handlers quedan, su end se sigue anotando).
  useEffect(() => {
    const r0 = relojes.current
    return () => {
      for (const t of Object.values(r0)) if (t !== undefined) clearTimeout(t)
      quiereEscuchar.current = false
      const r = rec.current
      if (r && vivo.current) {
        anotar(numero(r), 'abort llamado (salí de Contame)')
        try {
          r.abort?.()
        } catch {
          /* nada */
        }
      }
      rec.current = null
    }
  }, [])

  const texto = [final, parcial].filter(Boolean).join(' ')
  return { soportado, escuchando, ocupado, texto, empezar, terminar, borrar, recuperado, ...(error ? { error } : {}) }
}
