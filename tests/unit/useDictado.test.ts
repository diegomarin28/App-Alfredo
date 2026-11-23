import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useDictado } from '@/voz/useDictado'

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
  starts = 0
  stops = 0
  private resultados: Resultado[] = []
  constructor() { FakeRec.instancias.push(this) }
  start() {
    if (FakeRec.fallarProximoStart) { FakeRec.fallarProximoStart = false; throw new Error('InvalidStateError') }
    this.starts++
    this.resultados = []
  }
  stop() { this.stops++; this.onend?.() }
  abort() { this.onend?.() }
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
    expect(r.stops).toBe(1)
    expect(result.current.escuchando).toBe(false)
    act(() => r.onend?.())
    expect(r.starts).toBe(1)
    expect(FakeRec.instancias).toHaveLength(1)
    expect(result.current.texto).toBe('Listo')
  })

  it('no-speech y aborted se ignoran', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'no-speech' }))
    act(() => ultima().onerror?.({ error: 'aborted' }))
    expect(result.current.error).toBeUndefined()
    expect(result.current.escuchando).toBe(true)
  })

  it('not-allowed: para y avisa que falta el permiso', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    const r = ultima()
    act(() => r.onerror?.({ error: 'not-allowed' }))
    act(() => r.onend?.())
    expect(result.current.error).toBe('Falta el permiso del micrófono')
    expect(result.current.escuchando).toBe(false)
    expect(r.starts).toBe(1)
  })

  it.each(['network', 'language-not-supported', 'service-not-allowed', 'audio-capture', 'bad-grammar'])(
    'error %s: para (no reinicia) y avisa en castellano', (codigo) => {
      const { result } = renderHook(() => useDictado({}))
      act(() => result.current.empezar())
      const r = ultima()
      act(() => r.decir('Algo', true))
      act(() => r.onerror?.({ error: codigo }))
      act(() => r.onend?.())
      expect(result.current.escuchando).toBe(false)
      expect(result.current.error).toMatch(/^(No pude escuchar|No encuentro el micrófono|Falta el permiso)/)
      expect(r.starts).toBe(1)
      expect(FakeRec.instancias).toHaveLength(1)
      // lo dictado no se pierde
      expect(result.current.texto).toBe('Algo')
    })

  it('network da el mensaje de conexión', () => {
    const { result } = renderHook(() => useDictado({}))
    act(() => result.current.empezar())
    act(() => ultima().onerror?.({ error: 'network' }))
    expect(result.current.error).toBe('No pude escuchar. Revisá la conexión y probá de nuevo.')
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
})
