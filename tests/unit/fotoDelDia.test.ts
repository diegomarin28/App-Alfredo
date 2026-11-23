import { describe, expect, it } from 'vitest'
import { fotoDelDia } from '@/domain/fotoDelDia'

describe('fotoDelDia', () => {
  const fotos = ['a', 'b', 'c']
  it('es estable el mismo día', () => {
    expect(fotoDelDia(fotos, '2026-11-22')).toBe(fotoDelDia(fotos, '2026-11-22'))
  })
  it('cambia entre días consecutivos', () => {
    expect(fotoDelDia(fotos, '2026-11-22')).not.toBe(fotoDelDia(fotos, '2026-11-23'))
  })
  it('lista vacía → null', () => {
    expect(fotoDelDia([], '2026-11-22')).toBeNull()
  })
  it('una sola foto siempre sale', () => {
    expect(fotoDelDia(['x'], '2026-11-22')).toBe('x')
  })
})
