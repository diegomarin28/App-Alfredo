import { describe, expect, it } from 'vitest'
import { linkFamilia, vigenciaLarga } from '@/domain/linkFamilia'

describe('linkFamilia', () => {
  it('arma la URL con el código', () => {
    expect(linkFamilia('http://x.test', 'abc 1')).toBe('http://x.test/familia?codigo=abc%201')
  })
  it('sin código no hay link', () => {
    expect(linkFamilia('http://x.test', '')).toBeNull()
    expect(linkFamilia('http://x.test', undefined)).toBeNull()
  })
})

describe('vigenciaLarga', () => {
  it('escribe la fecha en español en hora de Montevideo', () => {
    expect(vigenciaLarga('2026-11-25T23:59:00-03:00')).toBe('25 de noviembre de 2026')
    expect(vigenciaLarga('2026-11-26T02:30:00Z')).toBe('25 de noviembre de 2026')
  })
  it('fecha ausente o inválida', () => {
    expect(vigenciaLarga(undefined)).toBeNull()
    expect(vigenciaLarga('nada')).toBeNull()
  })
})
