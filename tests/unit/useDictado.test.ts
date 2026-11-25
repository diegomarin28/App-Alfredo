import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _pagina, CLAVE_RECUPERAR, ERROR_PERMISO, ERROR_RED, ERROR_TRABADO, useDictado } from '@/voz/useDictado'
import { _reiniciarRegistro, leerRegistro, registroComoTexto } from '@/voz/registro'

type Resultado = { isFinal: boolean; 0: { transcript: string } }

class FakeRec {
  static instancias: FakeRec[] = []
  static fallarProximoStart = false
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: { resultIndex: number; results: Resultado[] }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  onsoundstart: (() => void) | null = null
  onspeechstart: (() => void) | null = null
  onspeechend: (() => void) | null = null
  onaudioend: (() => void) | null = null
  starts = 0
  stops = 0
  private resultados: Resultado[] = []
  constructor() { FakeRec.instancias.push(this) }
  start() {
    if (FakeRec.fallarProximoStart) { FakeRec.fallarProximoStart = false; throw new Error('InvalidStateError') }
    this.starts++
    this.resultados = []
  }
  abortos = 0
  stop() { this.stops++; this.onend?.() }
  abort() { this.abortos++; this.onend?.() }
  /** simula un resultado (parcial o final) de esta sesión */
  decir(texto: string, isFinal: boolean) {
    const r: Resultado = { isFinal, 0: { transcript: texto } }
    const i = this.resultados.findIndex((x) => !x.isFinal)
    const idx = i >= 0 ? i : this.resultados.length
    this.resultados[idx] = r
    this.onresult?.({ resultIndex: idx, results: [...this.resultados] })
  }
}

const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown }
const ultima = () => FakeRec.instancias[FakeRec.instancias.length - 1]

beforeEach(() => {
  FakeRec.instancias = []
  FakeRec.fallarProximoStart = false
  w.webkitSpeechRecognition = FakeRec
  sessionStorage.clear()
  _reiniciarRegistro()
  _pagina.huboAudio = false
})
afterEach(() => {
  delete w.webkitSpeechRecognition
  delete w.SpeechRecognition
})

describe('useDictado', () => {
  it('sin reconocimiento de voz: soportado false', () => {
    delete w.webkitSpeechRecognition
    const { result } = renderHook(() => useDictado({}))
    expect(result.current.soportado).toBe(false)
  })

  it('configura es-UY, continuo y con resultados parciales', () => {
    const { result } = renderHook(() => useDictado({}))
    expect(result.current.soportado).toBe(true)
    act(() => result.current.empezar())
    expect(result.current.escuchando).toBe(true)
    const r = ultima()
    expect(r.lang).toBe('es-UY')
    expect(r.continuous).toBe(true)
    expect(r.interimResults).toBe(true)
    expect(r.starts).toBe(1)
  })

  it('dos finales separados por un corte automático (onend) se acumulan en un texto', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Le pagué', false))
    expect(result.current.texto).toBe('Le pagué')
    act(() => r.decir('Le pagué a Simón', true))
    // Safari corta en la pausa: se reinicia solo
    act(() => r.onend?.())
    expect(result.current.escuchando).toBe(true)
    expect(r.starts).toBe(2)
    act(() => r.decir('ayer a la tarde', true))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde')
    // los parciales se ven en vivo al final
    act(() => r.decir('y', false))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde y')
  })

  it('si start() falla al reiniciar, crea una instancia nueva', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Hola', true))
    FakeRec.fallarProximoStart = true
    act(() => r.onend?.())
    expect(FakeRec.instancias).toHaveLength(2)
    const r2 = ultima()
    expect(r2.starts).toBe(1)
    act(() => r2.decir('de nuevo', true))
    expect(result.current.texto).toBe('Hola de nuevo')
  })

  it('terminar() deja de reiniciar', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Listo', true))
    act(() => result.current.terminar())
    expect(r.abortos).toBe(1)
    expect(result.current.escuchando).toBe(false)
    act(() => r.onend?.())
    expect(r.starts).toBe(1)
    expect(FakeRec.instancias).toHaveLength(1)
    expect(result.current.texto).toBe('Listo')
  })

  it('no-speech (silencio) se ignora: sigue escuchando', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'no-speech' }))
    expect(result.current.error).toBeUndefined()
    expect(result.current.escuchando).toBe(true)
    expect(recargar).not.toHaveBeenCalled()
  })

  it('not-allowed: para y avisa que falta el permiso (recargar no lo arregla)', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.onerror?.({ error: 'not-allowed' }))
    act(() => r.onend?.())
    expect(result.current.error).toBe('Falta el permiso del micrófono. Para activarlo: Ajustes → Apps → Safari → Micrófono → Permitir.')
    expect(result.current.escuchando).toBe(false)
    expect(r.starts).toBe(1)
    expect(recargar).not.toHaveBeenCalled()
  })

  it('service-not-allowed también es el permiso', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'service-not-allowed' }))
    expect(result.current.error).toBe(ERROR_PERMISO)
    expect(recargar).not.toHaveBeenCalled()
  })

  it('network sin conexión: avisa de la conexión y no recarga (Safari mostraría su página de error)', () => {
    const recargar = vi.fn()
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'network' }))
    expect(result.current.error).toBe(ERROR_RED)
    expect(result.current.escuchando).toBe(false)
    expect(recargar).not.toHaveBeenCalled()
    enLinea.mockRestore()
  })

  it('corta después de 5 reinicios seguidos sin resultado', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    for (let i = 0; i < 5; i++) act(() => r.onend?.())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(true)
    act(() => r.onend?.())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('un resultado reinicia la cuenta de reinicios', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    for (let i = 0; i < 5; i++) act(() => r.onend?.())
    act(() => r.decir('hola', true))
    for (let i = 0; i < 5; i++) act(() => r.onend?.())
    expect(result.current.escuchando).toBe(true)
    expect(r.starts).toBe(11)
    expect(result.current.error).toBeUndefined()
  })

  it('ignora eventos tardíos del reconocedor anterior (Grabar de nuevo)', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const viejo = ultima()
    act(() => viejo.decir('primera toma', true))
    act(() => result.current.terminar())
    act(() => result.current.borrar())
    act(() => result.current.empezar())
    const nuevo = ultima()
    expect(nuevo).not.toBe(viejo)
    act(() => viejo.decir('tarde', true))
    expect(result.current.texto).toBe('')
    act(() => viejo.onerror?.({ error: 'network' }))
    expect(result.current.error).toBeUndefined()
    expect(result.current.escuchando).toBe(true)
    act(() => viejo.onend?.())
    expect(viejo.starts).toBe(1)
    act(() => nuevo.decir('segunda toma', true))
    expect(result.current.texto).toBe('segunda toma')
  })

  it('empezar con un reconocedor activo lo cancela y usa uno nuevo', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const viejo = ultima()
    let abortado = false
    viejo.abort = () => { abortado = true; viejo.onend?.() }
    act(() => result.current.empezar())
    expect(abortado).toBe(true)
    expect(viejo.starts).toBe(1)
    expect(result.current.escuchando).toBe(true)
  })

  it('borrar() vacía el texto y empezar de nuevo limpia el error', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    act(() => ultima().decir('Algo', true))
    act(() => result.current.terminar())
    act(() => result.current.borrar())
    expect(result.current.texto).toBe('')
  })

  it('al terminar, lo parcial que se ve queda (no se espera al resultado final)', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    act(() => ultima().decir('Comprar pilas', true))
    act(() => ultima().decir('y leche', false))
    act(() => result.current.terminar())
    expect(result.current.texto).toBe('Comprar pilas y leche')
  })

  it('si Safari corta con algo sin confirmar, no se pierde al reiniciar', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Llamar a UTE', false))
    act(() => r.onend?.())
    act(() => r.decir('mañana', true))
    expect(result.current.texto).toBe('Llamar a UTE mañana')
  })

  it('terminar suelta los handlers del reconocedor', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => result.current.terminar())
    expect(r.onresult).toBeNull()
    expect(r.onerror).toBeNull()
    expect(r.onend).toBeNull()
  })
})

/**
 * Como el iPhone (ronda 8): stop() no termina nunca (no llega onend y el micrófono queda tomado), abort() después
 * de stop() no hace nada, y un start() con otro reconocedor vivo deja sordo al nuevo.
 */
class FakeIos {
  static instancias: FakeIos[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: { resultIndex: number; results: Resultado[] }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  estado: 'quieto' | 'escuchando' | 'parando' = 'quieto'
  sordo = false
  constructor() { FakeIos.instancias.push(this) }
  start() {
    if (this.estado !== 'quieto') throw new Error('InvalidStateError')
    this.sordo = FakeIos.instancias.some((o) => o !== this && o.estado !== 'quieto')
    this.estado = 'escuchando'
  }
  stop() { if (this.estado === 'escuchando') this.estado = 'parando' }
  abort() {
    if (this.estado !== 'escuchando') return
    this.estado = 'quieto'
    this.onend?.()
  }
  /** lo que dice la persona: solo llega si este reconocedor tiene el micrófono */
  decir(texto: string) {
    if (this.estado !== 'escuchando' || this.sordo) return
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: texto } }] })
  }
}

describe('useDictado en el iPhone: "Repetir" vuelve a escuchar', () => {
  beforeEach(() => {
    FakeIos.instancias = []
    w.webkitSpeechRecognition = FakeIos
  })

  it('grabar, repetir, grabar, cancelar, grabar: 10 de 10 veces seguidas', () => {
    const { result } = renderHook(() => useDictado({}))
    const grabar = (frase: string) => {
      act(() => result.current.empezar())
      const r = FakeIos.instancias[FakeIos.instancias.length - 1]
      act(() => r.decir(frase))
      act(() => result.current.terminar())
      expect(result.current.texto).toBe(frase)
      expect(result.current.escuchando).toBe(false)
    }
    for (let vez = 1; vez <= 10; vez++) {
      grabar(`grabar ${vez}`)
      act(() => result.current.borrar()) // Repetir
      grabar(`repetir ${vez}`)
      act(() => result.current.borrar())
      grabar(`grabar otra ${vez}`)
      act(() => result.current.borrar()) // Cancelar
      grabar(`después de cancelar ${vez}`)
      act(() => result.current.borrar())
    }
    expect(FakeIos.instancias).toHaveLength(40)
    expect(FakeIos.instancias.every((r) => !r.sordo)).toBe(true)
    expect(FakeIos.instancias.every((r) => r.estado === 'quieto')).toBe(true)
  })
})

describe('useDictado: permiso del micrófono denegado de antes', () => {
  const nav = navigator as unknown as { permissions?: unknown }
  const original = Object.getOwnPropertyDescriptor(navigator, 'permissions')
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'permissions', original)
    else delete nav.permissions
  })

  it('avisa cómo activarlo sin esperar al toque, y se va al permitirlo', async () => {
    const oyentes: (() => void)[] = []
    const estado = { state: 'denied', addEventListener: (_: string, f: () => void) => oyentes.push(f), removeEventListener() {} }
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => estado } })
    const { result } = renderHook(() => useDictado({}))
    await act(async () => {})
    expect(result.current.error).toMatch(/Ajustes → Apps → Safari → Micrófono/)
    estado.state = 'granted'
    act(() => oyentes.forEach((f) => f()))
    expect(result.current.error).toBeUndefined()
  })
})

describe('ronda 9: plan B que se recupera solo', () => {
  /** Ya llegó audio en esta carga de la página: no hay pedido de permiso que esperar. */
  const yaAnduvo = () => { _pagina.huboAudio = true }
  const guardado = () => JSON.parse(sessionStorage.getItem(CLAVE_RECUPERAR) ?? 'null') as { texto: string } | null
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sin audiostart en 2 s: guarda lo dictado y recarga', () => {
    yaAnduvo()
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().decir('Comprar pilas', true))
    act(() => { vi.advanceTimersByTime(1999) })
    expect(recargar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(guardado()).toEqual({ texto: 'Comprar pilas' })
    // el reconocedor trabado se suelta
    expect(ultima().abortos).toBe(1)
    expect(ultima().onend).toBeNull()
  })

  it('con audiostart a tiempo no recarga', () => {
    yaAnduvo()
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(500) })
    act(() => ultima().onaudiostart?.())
    act(() => { vi.advanceTimersByTime(10000) })
    expect(recargar).not.toHaveBeenCalled()
    expect(result.current.escuchando).toBe(true)
  })

  it('"Repetir" trabado (Safari reinicia y no llega audio): también recarga', () => {
    yaAnduvo()
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onaudiostart?.())
    act(() => result.current.terminar())
    act(() => result.current.borrar())
    act(() => result.current.empezar()) // Repetir
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it.each(['aborted', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar'])('error %s: guarda y recarga', (codigo) => {
    yaAnduvo()
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onaudiostart?.())
    act(() => ultima().decir('Llamar a UTE', false))
    act(() => ultima().onerror?.({ error: codigo }))
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(guardado()).toEqual({ texto: 'Llamar a UTE' })
  })

  it('al volver de la recarga: el texto está, pide un toque y sigue sumando', () => {
    sessionStorage.setItem(CLAVE_RECUPERAR, JSON.stringify({ texto: 'Comprar pilas' }))
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    expect(result.current.texto).toBe('Comprar pilas')
    expect(result.current.recuperado).toBe(true)
    expect(result.current.escuchando).toBe(false)
    expect(sessionStorage.getItem(CLAVE_RECUPERAR)).toBeNull() // una sola vez
    act(() => result.current.empezar())
    expect(result.current.recuperado).toBe(false)
    act(() => ultima().onaudiostart?.())
    act(() => ultima().decir('y leche', false))
    act(() => result.current.terminar())
    expect(result.current.texto).toBe('Comprar pilas y leche')
  })

  it('nunca queda trabado: tras 2 recargas sin audio avisa, y el próximo toque vuelve a probar', () => {
    yaAnduvo()
    const recargar = vi.fn()
    const montar = () => renderHook(() => useDictado({ recargar }))
    for (let vez = 1; vez <= 2; vez++) {
      const { result, unmount } = montar()
      act(() => result.current.empezar())
      act(() => { vi.advanceTimersByTime(2000) })
      expect(recargar).toHaveBeenCalledTimes(vez)
      unmount() // la página se recarga
    }
    const { result } = montar()
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe(ERROR_TRABADO)
    expect(result.current.escuchando).toBe(false)
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(3)
  })

  it('cuando llega audio, la cuenta de recargas vuelve a cero', () => {
    yaAnduvo()
    sessionStorage.setItem('alfredo:dictado:recargas', '2')
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onaudiostart?.())
    expect(sessionStorage.getItem('alfredo:dictado:recargas')).toBeNull()
  })

  it('antes del primer audio, sin "start" (Safari puede estar pidiendo permiso), espera más antes de recargar', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(recargar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(16000) })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('si ya llegó "start" (el permiso está dado) no espera más que 2 s', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onstart?.())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('terminar a tiempo cancela el vigía', () => {
    yaAnduvo()
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => result.current.terminar())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(recargar).not.toHaveBeenCalled()
  })
})

describe('ronda 9: registro de diagnóstico', () => {
  it('anota cada evento del reconocedor, en orden, con la hora en milisegundos', () => {
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => {
      r.onstart?.(); r.onaudiostart?.(); r.onsoundstart?.(); r.onspeechstart?.()
    })
    act(() => r.decir('hola', false))
    act(() => {
      r.onspeechend?.(); r.onaudioend?.(); r.onerror?.({ error: 'no-speech' }); r.onend?.()
    })
    act(() => result.current.terminar())
    const eventos = leerRegistro().filter((e) => e.n > 0).map((e) => e.ev)
    expect(eventos).toEqual([
      'creado', 'start llamado', 'start', 'audiostart', 'soundstart', 'speechstart', 'result (0 final, 4 letras parciales)',
      'speechend', 'audioend', 'error no-speech', 'end', 'start llamado', 'abort llamado',
    ])
    expect(registroComoTexto()).toMatch(/^Navegador: .+\n\d{2}:\d{2}:\d{2}\.\d{3} /)
    expect(registroComoTexto()).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3} #\d+ audiostart/)
  })

  it('el plan B queda anotado', () => {
    _pagina.huboAudio = true
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'audio-capture' }))
    const texto = registroComoTexto()
    expect(texto).toMatch(/error audio-capture/)
    expect(texto).toMatch(/plan B: error audio-capture \(recarga 1\)/)
    expect(texto).toMatch(/recargando la página/)
  })
})

describe('ronda 9: el pedido de permiso no dispara el plan B', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('con el permiso dado (granted) y sin audio: 2 s', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'permissions')
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'granted' }) } })
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    await act(async () => {})
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(1)
    if (original) Object.defineProperty(navigator, 'permissions', original)
    else delete (navigator as unknown as { permissions?: unknown }).permissions
  })
})

