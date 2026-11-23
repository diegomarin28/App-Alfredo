import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import ErrorApp from '@/app/(app)/error'
import NoEncontrada from '@/app/not-found'
import ErrorGlobal from '@/app/global-error'

describe('páginas de error en castellano', () => {
  it('error de la app: "Algo salió mal", Probá de nuevo llama a reset y hay vuelta al inicio', () => {
    const reset = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorApp error={new Error('boom')} reset={reset} />)
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Probá de nuevo' }))
    expect(reset).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('boom')).toBeNull()
  })

  it('no encontrada: texto y vuelta al inicio', () => {
    render(<NoEncontrada />)
    expect(screen.getByRole('heading', { name: 'No encontramos esa página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  it('error global: arma su propio html en castellano con reintentar y volver', () => {
    const html = renderToStaticMarkup(<ErrorGlobal error={new Error('x')} reset={() => {}} />)
    expect(html).toMatch(/^<html lang="es">/)
    expect(html).toContain('Algo salió mal')
    expect(html).toContain('Probá de nuevo')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('>x<')
  })
})
