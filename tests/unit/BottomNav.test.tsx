import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BottomNav from '@/components/BottomNav'

describe('BottomNav', () => {
  it('owner: Inicio, Calendario, Contame (al medio), Mensajes y Casas', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    for (const [n, href] of [['Inicio', '/'], ['Calendario', '/calendario'], ['Mensajes', '/mensajes'], ['Casas', '/casas']]) {
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

  it('familia: Inicio, Fechas, Fotos y Casas (sin Contame ni Mensajes)', () => {
    render(<BottomNav activo="inicio" rol="familia" />)
    expect(screen.queryByRole('link', { name: 'Hablar con el asistente' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Mensajes' })).toBeNull()
    expect(screen.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Inicio', '/'], ['Fechas', '/calendario'], ['Fotos', '/fotos'], ['Casas', '/casas'],
    ])
  })

  it('compacto en el teléfono: etiquetas de 14 px (16 px en lg) y cada pestaña del ancho de su texto', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    for (const n of ['Inicio', 'Calendario', 'Mensajes', 'Casas']) {
      const link = screen.getByRole('link', { name: n })
      expect(link).toHaveClass('text-sm', 'lg:text-base', 'min-h-12', 'flex-auto')
      expect(link.querySelector('svg')).toHaveAttribute('width', '24')
      for (const c of ['text-xs', 'flex-1']) expect(link).not.toHaveClass(c)
    }
  })
})

describe('BottomNav en computadora (lg: ≥ 1024 px)', () => {
  it('es una sola nav "Principal": barra de abajo en el teléfono, barra lateral fija a la izquierda en lg', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    const navs = screen.getAllByRole('navigation', { name: 'Principal' })
    expect(navs).toHaveLength(1)
    const nav = navs[0]
    // teléfono: igual que antes
    expect(nav).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'border-t')
    // lg: columna fija a la izquierda, a toda la altura
    expect(nav).toHaveClass('lg:inset-y-0', 'lg:left-0', 'lg:right-auto', 'lg:w-60', 'lg:border-t-0', 'lg:border-r')
    const lista = nav.firstElementChild!
    expect(lista).toHaveClass('flex', 'lg:flex-col')
  })

  it('en lg las pestañas van en fila (ícono + texto) con texto de 16 px', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    for (const n of ['Inicio', 'Calendario', 'Mensajes', 'Casas']) {
      const link = screen.getByRole('link', { name: n })
      expect(link).toHaveClass('flex-col', 'lg:flex-row', 'lg:justify-start', 'lg:text-base')
    }
  })

  it('Contame sigue destacado: en lg es un botón azul ancho con el texto visible', () => {
    render(<BottomNav activo="inicio" rol="owner" />)
    const contame = screen.getByRole('link', { name: 'Hablar con el asistente' })
    expect(contame).toHaveClass('bg-azul', 'text-white', 'lg:w-full', 'lg:rounded-xl')
    const texto = contame.querySelector('span')!
    expect(texto).toHaveTextContent('Hablar con el asistente')
    expect(texto).toHaveClass('hidden', 'lg:inline')
  })
})
