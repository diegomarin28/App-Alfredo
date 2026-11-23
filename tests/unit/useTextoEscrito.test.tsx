import { act, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTextoEscrito } from '@/components/useTextoEscrito'

function Campo({ inicial, largo }: { inicial: string; largo?: boolean }) {
  const [texto, setTexto, campo] = useTextoEscrito(inicial)
  return (
    <>
      {largo
        ? <textarea {...campo} aria-label="campo" value={texto} onChange={(e) => setTexto(e.target.value)} />
        : <input {...campo} aria-label="campo" value={texto} onChange={(e) => setTexto(e.target.value)} />}
      <output>{texto}</output>
    </>
  )
}

const errores = vi.spyOn(console, 'error')
afterEach(() => { errores.mockClear(); document.body.innerHTML = '' })

/** HTML del servidor; se escribe (o no) antes de que React enganche, y después se hidrata. */
async function hidratar(inicial: string, largo: boolean, escrito?: string) {
  const contenedor = document.createElement('div')
  contenedor.innerHTML = renderToString(<Campo inicial={inicial} largo={largo} />)
  document.body.appendChild(contenedor)
  const campo = contenedor.querySelector<HTMLInputElement | HTMLTextAreaElement>('[aria-label=campo]')!
  if (escrito !== undefined) campo.value = escrito
  await act(async () => { hydrateRoot(contenedor, <Campo inicial={inicial} largo={largo} />) })
  return { campo, salida: contenedor.querySelector('output')!.textContent }
}

describe('useTextoEscrito: lo escrito antes de que React enganche la página', () => {
  for (const [tipo, largo] of [['input', false], ['textarea', true]] as const) {
    it(`${tipo} vacío: el estado toma lo que ya estaba escrito`, async () => {
      const { campo, salida } = await hidratar('', largo, 'Llamar al plomero')
      expect(campo.value).toBe('Llamar al plomero')
      expect(salida).toBe('Llamar al plomero')
      expect(errores).not.toHaveBeenCalled()
    })

    it(`${tipo} con texto inicial editado: queda lo editado`, async () => {
      const { campo, salida } = await hidratar('Alfredo', largo, 'Alfre')
      expect(campo.value).toBe('Alfre')
      expect(salida).toBe('Alfre')
      expect(errores).not.toHaveBeenCalled()
    })

    it(`${tipo} sin tocar: queda el texto inicial`, async () => {
      const { campo, salida } = await hidratar('Alfredo', largo)
      expect(campo.value).toBe('Alfredo')
      expect(salida).toBe('Alfredo')
    })
  }

  it('al montar sin hidratar (navegación) no mira la página: usa el inicial', () => {
    const otro = Object.assign(document.createElement('input'), { value: 'de otra página' })
    const buscar = vi.spyOn(document, 'querySelector').mockReturnValue(otro)
    render(<Campo inicial="Alfredo" />)
    buscar.mockRestore()
    expect(document.querySelector('output')!.textContent).toBe('Alfredo')
  })
})
