import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _pagina, CLAVE_RECUPERAR, ERROR_PERMISO, ERROR_RED, ERROR_TRABADO, ESTRATEGIA, useDictado, type Estrategia,
} from '@/voz/useDictado'
import { _reiniciarRegistro, leerRegistro, registroComoTexto } from '@/voz/registro'

type Resultado = { isFinal: boolean; 0: { transcript: string } }

/**
 * Reconocedor falso. `FakeRec.alParar`: cuándo llega "end" después de stop()/abort():
 * 'ya' (en el momento), 'manual' (cuando la prueba llama fin()), 'nunca' (ni con abort).
 * `FakeRec.nuevasSordas`: como el iPhone según el registro de la ronda 10, una instancia creada después de que otra
 * arrancó manda start y audiostart pero nunca voz.
 */
class FakeRec {
  static instancias: FakeRec[] = []
  static fallarProximoStart = false
  static alParar: 'ya' | 'manual' | 'nunca' = 'ya'
  static abortTermina = true
  static nuevasSordas = false
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
  abortos = 0
  activo = false
  sorda = false
  private resultados: Resultado[] = []
  constructor() {
    this.sorda = FakeRec.nuevasSordas && FakeRec.instancias.some((o) => o.starts > 0)
    FakeRec.instancias.push(this)
  }
  start() {
    if (FakeRec.fallarProximoStart) { FakeRec.fallarProximoStart = false; throw new Error('InvalidStateError') }
    if (this.activo) throw new DOMException('ya empezó', 'InvalidStateError')
    this.activo = true
    this.starts++
    this.resultados = []
  }
  stop() {
    this.stops++
    if (FakeRec.alParar === 'ya') this.fin()
  }
  abort() {
    this.abortos++
    if (FakeRec.alParar === 'ya' || (FakeRec.alParar === 'manual' && FakeRec.abortTermina)) this.fin()
  }
  /** llega "end" */
  fin() {
    this.activo = false
    this.onend?.()
  }
  /** arranca el audio (start + audiostart), como Safari un rato después de start() */
  oir() {
    this.onstart?.()
    this.onaudiostart?.()
  }
  /** simula un resultado (parcial o final) de esta sesión; una instancia sorda no recibe nada */
  decir(texto: string, isFinal: boolean) {
    if (this.sorda) return
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
  FakeRec.abortTermina = true
  FakeRec.nuevasSordas = false
  w.webkitSpeechRecognition = FakeRec
  sessionStorage.clear()
  _reiniciarRegistro()
  _pagina.huboAudio = false
})
afterEach(() => {
  delete w.webkitSpeechRecognition
  delete w.SpeechRecognition
})

/** Una toma completa: grabar, oír, decir, cortar. */
function toma(result: { current: ReturnType<typeof useDictado> }, frase: string) {
  act(() => result.current.empezar())
  const r = ultima()
  act(() => r.oir())
  act(() => r.decir(frase, false))
  act(() => result.current.terminar())
  return r
}

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

  it('arranca con la estrategia de reusar la misma instancia', () => {
    expect(ESTRATEGIA).toBe('reusar')
  })

  it('dos finales separados por un corte automático (onend) se acumulan en un texto', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Le pagué', false))
    expect(result.current.texto).toBe('Le pagué')
    act(() => r.decir('Le pagué a Simón', true))
    // Safari corta en la pausa: se reinicia solo y sigue acumulando
    act(() => r.fin())
    expect(result.current.escuchando).toBe(true)
    expect(r.starts).toBe(2)
    act(() => r.decir('ayer a la tarde', true))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde')
    act(() => r.decir('y', false))
    expect(result.current.texto).toBe('Le pagué a Simón ayer a la tarde y')
  })

  it('si start() falla al reiniciar, crea una instancia nueva', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.decir('Hola', true))
    FakeRec.fallarProximoStart = true
    act(() => r.fin())
    expect(FakeRec.instancias).toHaveLength(2)
    const r2 = ultima()
    expect(r2.starts).toBe(1)
    act(() => r2.decir('de nuevo', true))
    expect(result.current.texto).toBe('Hola de nuevo')
  })

  it('terminar() llama stop() (no abort) y deja de reiniciar', () => {
    const { result } = renderHook(() => useDictado({}))
    const r = toma(result, 'Listo')
    expect(r.stops).toBe(1)
    expect(r.abortos).toBe(0)
    expect(result.current.escuchando).toBe(false)
    expect(r.starts).toBe(1)
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
    act(() => r.decir('y leche', true)) // Safari confirma al parar
    act(() => r.fin())
    expect(result.current.texto).toBe('Comprar pilas y leche')
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

  it('not-allowed: para y avisa cómo activar el permiso (recargar no lo arregla)', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.onerror?.({ error: 'not-allowed' }))
    act(() => r.fin())
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
    for (let i = 0; i < 5; i++) act(() => r.fin())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(true)
    act(() => r.fin())
    expect(r.starts).toBe(6)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('un resultado reinicia la cuenta de reinicios', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    for (let i = 0; i < 5; i++) act(() => r.fin())
    act(() => r.decir('hola', true))
    for (let i = 0; i < 5; i++) act(() => r.fin())
    expect(result.current.escuchando).toBe(true)
    expect(r.starts).toBe(11)
    expect(result.current.error).toBeUndefined()
  })

  it('borrar() vacía el texto', () => {
    const { result } = renderHook(() => useDictado({}))
    toma(result, 'Algo')
    act(() => result.current.borrar())
    expect(result.current.texto).toBe('')
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
})

describe('ronda 10: esperar el "end" del anterior', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('después de cortar queda ocupado hasta su "end": grabar se ignora, y después anda', () => {
    FakeRec.alParar = 'manual'
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    const r = toma(result, 'primera')
    expect(result.current.ocupado).toBe(true)
    act(() => result.current.empezar())
    expect(r.starts).toBe(1)
    expect(result.current.escuchando).toBe(false)
    expect(registro()).toContain('grabar ignorado: el anterior todavía no terminó')
    act(() => r.fin())
    expect(result.current.ocupado).toBe(false)
    act(() => result.current.empezar())
    expect(r.starts).toBe(2)
    expect(result.current.escuchando).toBe(true)
  })

  it('si "end" no llega en 1,5 s: abort() y se espera otra vez', () => {
    FakeRec.alParar = 'manual'
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    const r = toma(result, 'hola')
    act(() => { vi.advanceTimersByTime(1499) })
    expect(r.abortos).toBe(0)
    act(() => { vi.advanceTimersByTime(1) })
    expect(r.abortos).toBe(1) // abortTermina: llega el end
    expect(result.current.ocupado).toBe(false)
    expect(registro()).toContain('end no llegó en 1500 ms: abort llamado')
  })

  it('si tampoco llega con abort(): a los 1,5 s más se libera igual (nunca queda trabado)', () => {
    FakeRec.alParar = 'nunca'
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    const r = toma(result, 'hola')
    act(() => { vi.advanceTimersByTime(1500) })
    expect(r.abortos).toBe(1)
    expect(result.current.ocupado).toBe(true)
    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current.ocupado).toBe(false)
    expect(result.current.texto).toBe('hola')
    expect(registro()).toContain('end no llegó tampoco después de abort (1500 ms): se libera igual')
  })

  it('los handlers no se sacan: el "end" del anterior queda en el registro aunque ya se haya cortado', () => {
    FakeRec.alParar = 'manual'
    const { result } = renderHook(() => useDictado({ recargar: vi.fn(), estrategia: 'nueva' }))
    const r = toma(result, 'hola')
    expect(r.onend).toBeTypeOf('function')
    expect(r.onerror).toBeTypeOf('function')
    act(() => r.onerror?.({ error: 'aborted' }))
    act(() => r.fin())
    const n = leerRegistro().filter((e) => e.n > 0)
    const evs = n.map((e) => e.ev)
    expect(evs.indexOf('end')).toBeGreaterThan(evs.indexOf('stop llamado'))
    expect(evs).toContain('error aborted')
    expect(result.current.error).toBeUndefined()
    // y con otro reconocedor ya grabando, los eventos tardíos del anterior se anotan pero no cambian nada
    act(() => result.current.empezar())
    const r2 = ultima()
    expect(r2).not.toBe(r)
    act(() => r.decir('tarde', true))
    act(() => r.onerror?.({ error: 'network' }))
    act(() => r.fin())
    expect(result.current.escuchando).toBe(true)
    expect(result.current.error).toBeUndefined()
    expect(registro().filter((e) => e === 'end').length).toBe(2)
  })
})

describe('ronda 10: estrategias', () => {
  const cicloDiez = (estrategia: Estrategia) => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar, estrategia }))
    for (let vez = 1; vez <= 10; vez++) {
      for (const frase of [`grabar ${vez}`, `repetir ${vez}`, `grabar otra ${vez}`, `después de cancelar ${vez}`]) {
        toma(result, frase)
        expect(result.current.texto).toBe(frase)
        expect(result.current.ocupado).toBe(false)
        act(() => result.current.borrar())
      }
    }
    return recargar
  }

  it('reusar: grabar, repetir, grabar, cancelar, grabar 10 veces con la misma instancia', () => {
    cicloDiez('reusar')
    expect(FakeRec.instancias).toHaveLength(1)
    expect(FakeRec.instancias[0].starts).toBe(40)
    expect(registro().filter((e) => e === 'reuso la misma instancia')).toHaveLength(39)
  })

  it('nueva: una instancia por grabación', () => {
    cicloDiez('nueva')
    expect(FakeRec.instancias).toHaveLength(40)
  })

  it('como el iPhone del registro (instancias nuevas sordas): reusar anda 10 de 10', () => {
    FakeRec.nuevasSordas = true
    const recargar = cicloDiez('reusar')
    expect(recargar).not.toHaveBeenCalled()
  })

  it('como el iPhone del registro: con instancias nuevas, la segunda queda sorda y salta el plan B', () => {
    FakeRec.nuevasSordas = true
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar, estrategia: 'nueva' }))
    toma(result, 'primera')
    act(() => result.current.borrar())
    act(() => result.current.empezar()) // Repetir
    act(() => ultima().oir())
    act(() => ultima().decir('segunda', false))
    expect(result.current.texto).toBe('')
    act(() => result.current.terminar())
    expect(recargar).toHaveBeenCalledTimes(1)
  })
})

describe('ronda 10: plan B con el disparador correcto', () => {
  const guardado = () => JSON.parse(sessionStorage.getItem(CLAVE_RECUPERAR) ?? 'null') as { texto: string } | null
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('5 s desde audiostart sin speechstart ni result: guarda y recarga', () => {
    sessionStorage.setItem(CLAVE_RECUPERAR, JSON.stringify({ texto: 'Comprar pilas' }))
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(300) })
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(4999) })
    expect(recargar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(guardado()).toEqual({ texto: 'Comprar pilas' })
    expect(ultima().abortos).toBe(1)
    expect(registroComoTexto()).toMatch(/plan B: sordo: 5000 ms desde audiostart sin speechstart ni result/)
  })

  it('con speechstart a tiempo no recarga (aunque el result tarde)', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(3000) })
    act(() => ultima().onspeechstart?.())
    act(() => { vi.advanceTimersByTime(20000) })
    expect(recargar).not.toHaveBeenCalled()
    expect(result.current.escuchando).toBe(true)
  })

  it('con un result a tiempo no recarga', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => ultima().decir('hola', false))
    act(() => { vi.advanceTimersByTime(20000) })
    expect(recargar).not.toHaveBeenCalled()
  })

  it('Alfredo cortó sin que llegara ningún result: guarda y recarga', () => {
    sessionStorage.setItem(CLAVE_RECUPERAR, JSON.stringify({ texto: 'Comprar pilas' }))
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => result.current.terminar())
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(guardado()).toEqual({ texto: 'Comprar pilas' })
  })

  it('sin audiostart en 2 s (el motor no arrancó): también recarga', () => {
    _pagina.huboAudio = true
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it.each(['aborted', 'audio-capture', 'network', 'language-not-supported', 'bad-grammar'])('error %s mientras graba: guarda y recarga', (codigo) => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
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
    expect(sessionStorage.getItem(CLAVE_RECUPERAR)).toBeNull() // una sola vez
    act(() => result.current.empezar())
    expect(result.current.recuperado).toBe(false)
    act(() => ultima().oir())
    act(() => ultima().decir('y leche', false))
    act(() => result.current.terminar())
    expect(result.current.texto).toBe('Comprar pilas y leche')
  })

  it('nunca queda trabado: tras 2 recargas sordas avisa qué hacer, y el próximo toque vuelve a probar', () => {
    const recargar = vi.fn()
    const sorda = (result: { current: ReturnType<typeof useDictado> }) => {
      act(() => result.current.empezar())
      act(() => ultima().oir())
      act(() => { vi.advanceTimersByTime(5000) })
    }
    for (let vez = 1; vez <= 2; vez++) {
      const { result, unmount } = renderHook(() => useDictado({ recargar }))
      sorda(result)
      expect(recargar).toHaveBeenCalledTimes(vez)
      unmount() // la página se recarga
    }
    const { result } = renderHook(() => useDictado({ recargar }))
    sorda(result)
    expect(recargar).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe(ERROR_TRABADO)
    expect(result.current.escuchando).toBe(false)
    expect(result.current.ocupado).toBe(false)
    sorda(result)
    expect(recargar).toHaveBeenCalledTimes(3)
  })

  it('cuando llega voz, la cuenta de recargas vuelve a cero (audiostart solo no alcanza)', () => {
    sessionStorage.setItem('alfredo:dictado:recargas', '2')
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().oir())
    expect(sessionStorage.getItem('alfredo:dictado:recargas')).toBe('2')
    act(() => ultima().onspeechstart?.())
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

  it('si ya llegó "start" (el permiso está dado) y no llega audiostart: 2 s', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    act(() => result.current.empezar())
    act(() => ultima().onstart?.())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

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

  it('cortar a tiempo (con voz) no deja vigías andando', () => {
    const recargar = vi.fn()
    const { result } = renderHook(() => useDictado({ recargar }))
    toma(result, 'hola')
    act(() => { vi.advanceTimersByTime(30000) })
    expect(recargar).not.toHaveBeenCalled()
  })
})

describe('registro de diagnóstico', () => {
  it('anota cada evento del reconocedor, en orden, con la hora en milisegundos', () => {
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
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
      'speechend', 'audioend', 'error no-speech', 'end', 'start llamado', 'stop llamado', 'end', 'terminó: se puede grabar de nuevo',
    ])
    expect(registroComoTexto()).toMatch(/^Navegador: .+\n\d{2}:\d{2}:\d{2}\.\d{3} /)
    expect(registroComoTexto()).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3} #\d+ audiostart/)
  })

  it('el plan B queda anotado', () => {
    const { result } = renderHook(() => useDictado({ recargar: vi.fn() }))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'audio-capture' }))
    const texto = registroComoTexto()
    expect(texto).toMatch(/error audio-capture/)
    expect(texto).toMatch(/abort llamado \(plan B\)/)
    expect(texto).toMatch(/plan B: error audio-capture \(recarga 1\)/)
    expect(texto).toMatch(/recargando la página/)
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
