import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BottomNav from '@/components/BottomNav'

describe('BottomNav', () => {
  it('owner: 4 enlaces con nombre + botón central a /contame', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    for (const [n, href] of [['Inicio', '/'], ['Calendario', '/calendario'], ['Mensajes', '/mensajes'], ['Portofino', '/casas']]) {
      expect(screen.getByRole('link', { name: n })).toHaveAttribute('href', href)
    }
    expect(screen.getByRole('link', { name: 'Hablar con el asistente' })).toHaveAttribute('href', '/contame')
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('marca solo la pestaña activa con aria-current="page"', () => {
    render(<BottomNav activo="calendario" rol="owner" />)
    expect(screen.getByRole('link', { name: 'Calendario' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
  })

  it('familia: sin Contame ni Mensajes', () => {
    render(<BottomNav activo="inicio" rol="familia" />)
    expect(screen.queryByRole('link', { name: 'Hablar con el asistente' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Mensajes' })).toBeNull()
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['Inicio', 'Calendario', 'Portofino'])
  })

  it('etiquetas en text-sm (14 px), no text-xs', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    for (const n of ['Inicio', 'Calendario', 'Mensajes', 'Portofino']) {
      const link = screen.getByRole('link', { name: n })
      expect(link).toHaveClass('text-sm')
      expect(link).not.toHaveClass('text-xs')
    }
  })
})
