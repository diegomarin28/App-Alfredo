import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('@/app/(app)/contactos/actions', () => ({ crearGrupo: async () => ({ ok: true }) }))
const { default: Contactos } = await import('@/app/(app)/contactos/Contactos')
import type { Contacto } from '@/domain/tipos'

const contactos: Contacto[] = [
  { id: '1', nombre: 'Martín Pérez', empresa: 'Ferretería Sur' },
  { id: '2', nombre: 'Lucía Gómez', empresa: 'Aberturas Gómez' },
  { id: '3', nombre: 'Dr. Silva' },
]

describe('Contactos: lo escrito antes de que React enganche la página', () => {
  it('filtra con el texto que ya estaba en el buscador al hidratar', async () => {
    // HTML del servidor, y alguien escribe antes de que cargue el JavaScript (el teléfono va lento).
    const contenedor = document.createElement('div')
    contenedor.innerHTML = renderToString(<Contactos contactos={contactos} grupos={[]} />)
    document.body.appendChild(contenedor)
    const buscar = contenedor.querySelector<HTMLInputElement>('input[type=search]')!
    buscar.value = 'martin'
    buscar.dispatchEvent(new Event('input', { bubbles: true }))

    await act(async () => { hydrateRoot(contenedor, <Contactos contactos={contactos} grupos={[]} />) })

    expect(buscar.value).toBe('martin')
    expect(contenedor.querySelectorAll('li')).toHaveLength(1)
    expect(contenedor.textContent).toContain('Martín Pérez')
    contenedor.remove()
  })
})
