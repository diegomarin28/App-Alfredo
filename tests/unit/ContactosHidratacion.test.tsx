import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Contactos from '@/app/(app)/contactos/Contactos'
import type { Contacto } from '@/domain/tipos'

const contactos: Contacto[] = [
  { id: '1', nombre: 'Martín Pérez', tipo: 'cliente', empresa: 'Ferretería Sur' },
  { id: '2', nombre: 'Lucía Gómez', tipo: 'proveedor', empresa: 'Aberturas Gómez' },
  { id: '3', nombre: 'Dr. Silva', tipo: 'otro' },
]

describe('Contactos: lo escrito antes de que React enganche la página', () => {
  it('filtra con el texto que ya estaba en el buscador al hidratar', async () => {
    // HTML del servidor, y alguien escribe antes de que cargue el JavaScript (el teléfono va lento).
    const contenedor = document.createElement('div')
    contenedor.innerHTML = renderToString(<Contactos contactos={contactos} />)
    document.body.appendChild(contenedor)
    const buscar = contenedor.querySelector<HTMLInputElement>('input[type=search]')!
    buscar.value = 'martin'
    buscar.dispatchEvent(new Event('input', { bubbles: true }))

    await act(async () => { hydrateRoot(contenedor, <Contactos contactos={contactos} />) })

    expect(buscar.value).toBe('martin')
    expect(contenedor.querySelectorAll('li')).toHaveLength(1)
    expect(contenedor.textContent).toContain('Martín Pérez')
    contenedor.remove()
  })
})
