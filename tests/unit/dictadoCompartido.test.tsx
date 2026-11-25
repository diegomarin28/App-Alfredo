import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorDictado, useDictadoCompartido, type DictadoCompartido } from '@/voz/DictadoCompartido'
import { _apertura } from '@/voz/useDictado'
import { _reiniciarRegistro, leerRegistro } from '@/voz/registro'
import { soltarPuente } from '@/voz/puenteTeclado'
import BottomNav from '@/components/BottomNav'

const nav = vi.hoisted(() => ({ ruta: '/' }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.ruta,
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

class FakeRec {
  static instancias: FakeRec[] = []
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null
  onaudiostart: (() => void) | null = null
  starts = 0
  stops = 0
  abortos = 0
  constructor() { FakeRec.instancias.push(this) }
  start() { this.starts++ }
  stop() { this.stops++; this.onend?.() }
  abort() { this.abortos++; this.onerror?.({ error: 'aborted' }); this.onend?.() }
}

const w = window as unknown as { webkitSpeechRecognition?: unknown }
const registro = () => leerRegistro().map((e) => e.ev)

/** Lo que ve una pantalla del dictado compartido. */
let visto: DictadoCompartido | null = null
function Espia() {
  visto = useDictadoCompartido()
  return null
}
function App() {
  return (
    <ProveedorDictado>
      <Espia />
      <BottomNav rol="owner" />
    </ProveedorDictado>
  )
}
const microfono = () => screen.getByRole('link', { name: 'Hablar con el asistente' })

beforeEach(() => {
  FakeRec.instancias = []
  w.webkitSpeechRecognition = FakeRec
  _apertura.usado = false
  nav.ruta = '/'
  sessionStorage.clear()
  _reiniciarRegistro()
  visto = null
})
afterEach(() => {
  delete w.webkitSpeechRecognition
  soltarPuente()
})

describe('ronda 12: hablar con un solo toque desde el menú', () => {
  it('el toque en el micrófono del menú crea y arranca el reconocedor ahí mismo (sincrónico) y lo anota', () => {
    const { rerender } = render(<App />)
    fireEvent.click(microfono())
    // dentro del mismo toque: ya hay reconocedor y start() ya se llamó
    expect(FakeRec.instancias).toHaveLength(1)
    expect(FakeRec.instancias[0].starts).toBe(1)
    expect(visto?.escuchando).toBe(true)
    expect(registro()).toContain('grabación desde el menú')
    // sigue escuchando al llegar a Contame (vive en el layout, no en la página)
    nav.ruta = '/contame'
    rerender(<App />)
    expect(visto?.escuchando).toBe(true)
    expect(FakeRec.instancias[0].stops).toBe(0)
  })

  it('si sale de Contame mientras escucha, corta', () => {
    nav.ruta = '/contame'
    const { rerender } = render(<App />)
    fireEvent.click(microfono())
    nav.ruta = '/calendario'
    rerender(<App />)
    expect(visto?.escuchando).toBe(false)
    expect(FakeRec.instancias[0].stops).toBe(1)
    expect(registro()).toContain('salí de Contame (/calendario): corto la grabación')
  })

  it('tocar el micrófono del menú mientras escucha: corta y pide la caja del teclado', () => {
    nav.ruta = '/contame'
    render(<App />)
    fireEvent.click(microfono())
    fireEvent.click(microfono())
    expect(visto?.escuchando).toBe(false)
    expect(visto?.pedidoTeclado).toBe('teclado')
    expect(FakeRec.instancias[0].stops).toBe(1)
  })

  it('después de la primera vez de la apertura: no prueba el dictado web, abre el teclado desde el toque', () => {
    _apertura.usado = true
    render(<App />)
    fireEvent.click(microfono())
    expect(FakeRec.instancias).toHaveLength(0)
    expect(visto?.pedidoTeclado).toBe('teclado')
    // el campo invisible ya tiene el foco (iOS abre el teclado solo dentro del toque)
    const puente = document.querySelector<HTMLInputElement>('input[data-puente-teclado]')
    expect(puente).not.toBeNull()
    expect(document.activeElement).toBe(puente)
    act(() => visto?.atenderTeclado())
    expect(visto?.pedidoTeclado).toBeNull()
  })

  it('si queda sordo (también antes de llegar a Contame), pide la caja con "fallo"', () => {
    vi.useFakeTimers()
    render(<App />)
    fireEvent.click(microfono())
    act(() => { FakeRec.instancias[0].onstart?.(); FakeRec.instancias[0].onaudiostart?.() })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(visto?.pedidoTeclado).toBe('fallo')
    expect(visto?.escuchando).toBe(false)
    // nuestro propio abort no dispara nada más
    expect(FakeRec.instancias[0].abortos).toBe(1)
    vi.useRealTimers()
  })

  it('sin proveedor (familia, o un componente suelto) el menú sigue siendo un link', () => {
    render(<BottomNav rol="owner" />)
    fireEvent.click(microfono())
    expect(FakeRec.instancias).toHaveLength(0)
  })
})
