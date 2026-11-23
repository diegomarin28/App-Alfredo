import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('browser-image-compression', () => ({ default: async (f: Blob) => f }))

const { default: Subir } = await import('@/app/(app)/Subir')

const entradas = () => [...document.querySelectorAll<HTMLInputElement>('input[type=file]')]

describe('Subir', () => {
  it('documentos: cámara y galería quedan deshabilitadas hasta que hay título', () => {
    render(<Subir tipo="documento" carpetaId="c1" />)
    expect(entradas()).toHaveLength(2)
    for (const i of entradas()) expect(i).toBeDisabled()
    expect(screen.getByText('Primero poné un título')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '   ' } })
    for (const i of entradas()) expect(i).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Póliza auto' } })
    for (const i of entradas()) expect(i).toBeEnabled()
    expect(screen.queryByText('Primero poné un título')).toBeNull()
  })

  it('fotos: sin título, los dos botones andan de entrada', () => {
    render(<Subir tipo="foto" />)
    for (const i of entradas()) expect(i).toBeEnabled()
    expect(screen.queryByText('Primero poné un título')).toBeNull()
  })
})
