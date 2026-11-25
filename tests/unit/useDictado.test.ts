import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { _apertura, ERROR_PERMISO, ERROR_RED, useDictado } from '@/voz/useDictado'
import { _reiniciarRegistro, leerRegistro, registroComoTexto } from '@/voz/registro'

type Resultado = { isFinal: boolean; 0: { transcript: string } }

/** Reconocedor falso. `alParar`: si stop()/abort() mandan "end" en el momento o cuando la prueba llama fin(). */
class FakeRec {
  static instancias: FakeRec[] = []
  static fallarProximoStart = false
  static alParar: 'ya' | 'manual' = 'ya'
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: { resultIndex: number; results: Resultado[] }) => void) | null = null
  onerror: ((e: { error: string; message?: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  onsoundstart: (() => void) | null = null
  onspeechstart: (() => void) | null = null
  onspeechend: (() => void) | null = null
  onaudioend: (() => void) | null = null
  starts = 0
  stops = 0
  abortos = 0
  private resultados: Resultado[] = []
  constructor() { FakeRec.instancias.push(this) }
  start() {
    if (FakeRec.fallarProximoStart) { FakeRec.fallarProximoStart = false; throw new Error('InvalidStateError') }
    this.starts++
    this.resultados = []
  }
  stop() {
    this.stops++
    if (FakeRec.alParar === 'ya') this.fin()
  }
  /** como Safari: un abort nuestro llega como error "aborted" y después "end" */
  abort() {
    this.abortos++
    this.onerror?.({ error: 'aborted', message: 'No speech detected' })
    this.fin()
  }
  fin() { this.onend?.() }
  /** start + audiostart, como Safari un rato después de start() */
  oir() {
    this.onstart?.()
    this.onaudiostart?.()
  }
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
const registro = () => leerRegistro().map((e) => e.ev)

beforeEach(() => {
  FakeRec.instancias = []
  FakeRec.fallarProximoStart = false
  FakeRec.alParar = 'ya'
  w.webkitSpeechRecognition = FakeRec
  sessionStorage.clear()
  _reiniciarRegistro()
  _apertura.usado = false
})
afterEach(() => {
  delete w.webkitSpeechRecognition
  delete w.SpeechRecognition
})

describe('useDictado', () => {
  it('sin reconocimiento de voz: soportado y disponible false', () => {
    delete w.webkitSpeechRecognition
    const { result } = renderHook(() => useDictado({}))
    expect(result.current.soportado).toBe(false)
    expect(result.current.disponible).toBe(false)
  })

  it('configura es-UY, continuo y con resultados parciales', () => {
    const { result } = renderHook(() => useDictado({}))
    expect(result.current.disponible).toBe(true)
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
    act(() => r.fin())
    expect(result.current.escuchando).toBe(true)
    expect(r.starts).toBe(2)
    act(() => r.decir('ayer a la tarde', true))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde')
    act(() => r.decir('y', false))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde y')
  })

  it('terminar() llama stop(), deja de reiniciar y no pierde lo dictado', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Listo', false))
    act(() => result.current.terminar())
    expect(r.stops).toBe(1)
    expect(r.abortos).toBe(0)
    expect(r.starts).toBe(1)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.texto).toBe('Listo')
  })

  it('el resultado final que llega después de stop() no duplica lo parcial', () => {
    FakeRec.alParar = 'manual'
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Comprar pilas', true))
    act(() => r.decir('y leche', false))
    act(() => result.current.terminar())
    expect(result.current.texto).toBe('Comprar pilas y leche')
    act(() => r.decir('y leche', true))
    act(() => r.fin())
    expect(result.current.texto).toBe('Comprar pilas y leche')
  })

  it('si Safari corta con algo sin confirmar, no se pierde al reiniciar', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Llamar a UTE', false))
    act(() => r.fin())
    act(() => r.decir('mañana', true))
    expect(result.current.texto).toBe('Llamar a UTE mañana')
  })

  it('no-speech (silencio) se ignora: sigue escuchando', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'no-speech' }))
    expect(result.current.escuchando).toBe(true)
    expect(alFallar).not.toHaveBeenCalled()
  })

  it('corta después de 5 reinicios seguidos sin resultado', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    for (let i = 0; i < 5; i++) act(() => r.fin())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(true)
    act(() => r.fin())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('borrar() vacía el texto', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    act(() => ultima().decir('Algo', true))
    act(() => result.current.terminar())
    act(() => result.current.borrar())
    expect(result.current.texto).toBe('')
  })
})

describe('ronda 11: el dictado web anda una vez por apertura', () => {
  it('después de la primera grabación ya no está disponible (y grabar se ignora)', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    expect(result.current.disponible).toBe(false)
    act(() => ultima().decir('primera', false))
    act(() => result.current.terminar())
    act(() => result.current.empezar())
    expect(FakeRec.instancias).toHaveLength(1)
    expect(ultima().starts).toBe(1)
    expect(result.current.escuchando).toBe(false)
    expect(registro()).toContain('grabar ignorado: el dictado web ya se usó en esta apertura')
  })

  it('se recuerda en memoria: al volver a Contame (otro montaje, misma apertura) sigue sin estar disponible', () => {
    const primera = renderHook(() => useDictado({}))
    act(() => primera.result.current.empezar())
    primera.unmount()
    const { result } = renderHook(() => useDictado({}))
    expect(result.current.disponible).toBe(false)
    // en memoria, no en sessionStorage (ahí solo está el registro de diagnóstico)
    expect(Object.keys(sessionStorage).filter((k) => k !== 'alfredo:dictado:registro')).toEqual([])
  })

  it('una apertura nueva (memoria vacía) vuelve a tenerlo', () => {
    _apertura.usado = true
    expect(renderHook(() => useDictado({})).result.current.disponible).toBe(false)
    _apertura.usado = false
    expect(renderHook(() => useDictado({})).result.current.disponible).toBe(true)
  })
})

describe('ronda 11: si el dictado web no anda, al teclado (sin recargar)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('sordo: 3 s desde audiostart sin speechstart ni result → corta y avisa una sola vez', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(2999) })
    expect(alFallar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(alFallar).toHaveBeenCalledTimes(1)
    expect(result.current.escuchando).toBe(false)
    expect(ultima().abortos).toBe(1)
    // el "aborted" de nuestro propio abort solo se anota (antes disparaba otra recarga)
    expect(registro()).toContain('error aborted: No speech detected')
    act(() => { vi.advanceTimersByTime(60000) })
    expect(alFallar).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeUndefined()
  })

  it('con speechstart o un result a tiempo, no', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(2000) })
    act(() => ultima().onspeechstart?.())
    act(() => { vi.advanceTimersByTime(20000) })
    expect(alFallar).not.toHaveBeenCalled()
    expect(result.current.escuchando).toBe(true)
  })

  it('sordo después de un corte de Safari: lo dictado queda y pasa al teclado', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.oir())
    act(() => r.decir('Comprar pilas', false))
    act(() => r.fin()) // Safari corta en una pausa y se reinicia
    act(() => r.oir())
    act(() => { vi.advanceTimersByTime(3000) })
    expect(alFallar).toHaveBeenCalledTimes(1)
    expect(result.current.texto).toBe('Comprar pilas')
  })

  it('el "aborted" que llega después de que Alfredo cortó se ignora', () => {
    const alFallar = vi.fn()
    FakeRec.alParar = 'manual'
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('hola', false))
    act(() => result.current.terminar())
    act(() => r.onerror?.({ error: 'aborted' }))
    act(() => r.fin())
    expect(alFallar).not.toHaveBeenCalled()
    expect(result.current.texto).toBe('hola')
  })

  it('sin audiostart en 2 s (ya llegó "start"): al teclado', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().onstart?.())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(alFallar).toHaveBeenCalledTimes(1)
  })

  it('sin "start" todavía (Safari puede estar pidiendo permiso): espera más', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(alFallar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(16000) })
    expect(alFallar).toHaveBeenCalledTimes(1)
  })

  it.each(['aborted', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar'])('error %s mientras graba: al teclado con lo dictado', (codigo) => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().decir('Llamar a UTE', false))
    act(() => ultima().onerror?.({ error: codigo }))
    expect(alFallar).toHaveBeenCalledTimes(1)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.texto).toBe('Llamar a UTE')
  })

  it('si start() lanza al reiniciar: al teclado', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    FakeRec.fallarProximoStart = true
    act(() => ultima().fin())
    expect(alFallar).toHaveBeenCalledTimes(1)
  })

  it('not-allowed: al teclado y explica cómo activar el permiso', () => {
    const alFallar = vi.fn()
    const { result } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'not-allowed' }))
    expect(result.current.error).toBe('Falta el permiso del micrófono. Para activarlo: Ajustes → Apps → Safari → Micrófono → Permitir.')
    expect(alFallar).toHaveBeenCalledTimes(1)
  })

  it('service-not-allowed también es el permiso', () => {
    const { result } = renderHook(() => useDictado({ alFallar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'service-not-allowed' }))
    expect(result.current.error).toBe(ERROR_PERMISO)
  })

  it('network sin conexión: avisa de la conexión', () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useDictado({ alFallar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'network' }))
    expect(result.current.error).toBe(ERROR_RED)
    enLinea.mockRestore()
  })

  it('salir de Contame en medio de una grabación corta sin avisar ni pasar al teclado', () => {
    const alFallar = vi.fn()
    const { result, unmount } = renderHook(() => useDictado({ alFallar }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.oir())
    unmount()
    expect(r.abortos).toBe(1)
    act(() => { vi.advanceTimersByTime(30000) })
    expect(alFallar).not.toHaveBeenCalled()
  })

  it('no recarga la página nunca', () => {
    const recarga = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload: recarga } })
    const { result } = renderHook(() => useDictado({ alFallar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(60000) })
    act(() => ultima().onerror?.({ error: 'audio-capture' }))
    expect(recarga).not.toHaveBeenCalled()
    Object.defineProperty(window, 'location', { configurable: true, value: original })
  })
})

describe('registro de diagnóstico', () => {
  it('anota cada evento del reconocedor, en orden, con la hora en milisegundos', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => {
      r.onstart?.(); r.onaudiostart?.(); r.onsoundstart?.(); r.onspeechstart?.()
    })
    act(() => r.decir('hola', false))
    act(() => {
      r.onspeechend?.(); r.onaudioend?.(); r.onerror?.({ error: 'no-speech' }); r.fin()
    })
    act(() => result.current.terminar())
    const eventos = leerRegistro().filter((e) => e.n > 0).map((e) => e.ev)
    expect(eventos).toEqual([
      'creado', 'start llamado', 'start', 'audiostart', 'soundstart', 'speechstart', 'result (0 final, 4 letras parciales)',
      'speechend', 'audioend', 'error no-speech', 'end', 'start llamado', 'stop llamado', 'end',
    ])
    expect(registroComoTexto()).toMatch(/^Navegador: .+\n\d{2}:\d{2}:\d{2}\.\d{3} /)
  })

  it('cuando no anda, queda anotado por qué', () => {
    const { result } = renderHook(() => useDictado({ alFallar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'audio-capture' }))
    expect(registroComoTexto()).toMatch(/dictado web no anda: error audio-capture → teclado/)
    expect(registroComoTexto()).not.toMatch(/recarg/)
  })
})

describe('ronda 12: origen y permiso', () => {
  it('anota desde dónde arrancó la grabación', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar('menú'))
    expect(registro()).toContain('grabación desde el menú')
  })

  it('informa el estado del permiso (prompt: Safari lo pide cada vez)', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'permissions')
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: 'prompt' }) } })
    const { result } = renderHook(() => useDictado({}))
    await act(async () => {})
    expect(result.current.permiso).toBe('prompt')
    expect(result.current.error).toBeUndefined()
    if (original) Object.defineProperty(navigator, 'permissions', original)
    else delete (navigator as unknown as { permissions?: unknown }).permissions
  })
})

describe('permiso del micrófono denegado de antes', () => {
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
