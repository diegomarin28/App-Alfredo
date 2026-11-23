import { describe, expect, it } from 'vitest'
import { validarEstilo, validarNombre } from '@/domain/validarAjustes'

describe('validarNombre', () => {
  it('recorta y acepta 1 a 40 caracteres', () => {
    expect(validarNombre('  Alfredo ')).toEqual({ ok: true, valor: 'Alfredo' })
    expect(validarNombre('x'.repeat(40))).toEqual({ ok: true, valor: 'x'.repeat(40) })
  })
  it('rechaza vacío, solo espacios, largo y no texto', () => {
    expect(validarNombre('   ')).toEqual({ ok: false, error: 'Escribí cómo querés que te saluden.' })
    expect(validarNombre('x'.repeat(41))).toEqual({ ok: false, error: 'El nombre es muy largo (máximo 40 letras).' })
    expect(validarNombre(5).ok).toBe(false)
    expect(validarNombre(undefined).ok).toBe(false)
  })
})

describe('validarEstilo', () => {
  it('acepta vacío y hasta 4000 caracteres', () => {
    expect(validarEstilo('')).toEqual({ ok: true, valor: '' })
    expect(validarEstilo(' Dale, va ')).toEqual({ ok: true, valor: 'Dale, va' })
    expect(validarEstilo('x'.repeat(4000)).ok).toBe(true)
  })
  it('rechaza más de 4000 y no texto', () => {
    expect(validarEstilo('x'.repeat(4001))).toEqual({ ok: false, error: 'Es muy largo (máximo 4000 letras).' })
    expect(validarEstilo(null).ok).toBe(false)
  })
})
