import { describe, expect, it } from 'vitest'
import { corregirPalabrasUy, DEPARTAMENTOS, PALABRAS_UY } from '@/domain/palabrasUy'
import { corregirNombres } from '@/domain/nombres'
import { construirSistema } from '@/ai/contamePrompt'

describe('palabras de Uruguay (ronda 8)', () => {
  it('los 19 departamentos', () => {
    expect(DEPARTAMENTOS).toHaveLength(19)
    expect(new Set(DEPARTAMENTOS).size).toBe(19)
  })

  it('"Can Ahillones" → "Canelones" y "Maldo nado" → "Maldonado"', () => {
    expect(corregirPalabrasUy('Mañana voy a Can Ahillones')).toBe('Mañana voy a Canelones')
    expect(corregirPalabrasUy('can ahillones')).toBe('Canelones')
    expect(corregirPalabrasUy('El sábado en Maldo nado con Pau')).toBe('El sábado en Maldonado con Pau')
  })

  it('el diccionario de correcciones (antes de la IA) también las corrige', () => {
    expect(corregirNombres('Pau Henrique está en Can Ahillones')).toBe('Pau Gericke está en Canelones')
    expect(corregirNombres('Maldo nado')).toBe('Maldonado')
  })

  it.each([
    ['monte video', 'Montevideo'],
    ['Pay sandu', 'Paysandú'],
    ['Piriapolis', 'Piriápolis'],
    ['tacuarembo', 'Tacuarembó'],
    ['punta del este', 'Punta del Este'],
    ['Punta de Este', 'Punta del Este'],
    ['Punta Carreta', 'Punta Carretas'],
    ['jose ignacio', 'José Ignacio'],
    ['Mana ntiales', 'Manantiales'],
    ['Porto fino', 'Portofino'],
    ['malibu', 'Malibú'],
    ['Antell', 'Antel'],
    ['antel', 'Antel'],
    ['Inten dencia', 'Intendencia'],
    ['San Jose', 'San José'],
    ['Rio Negro', 'Río Negro'],
  ])('%s → %s', (mal, bien) => {
    expect(corregirPalabrasUy(mal)).toBe(bien)
  })

  it.each([
    ['la factura de Ute', 'la factura de UTE'],
    ['pagar U T E y O.S.E.', 'pagar UTE y OSE'],
    ['llamar al bps', 'llamar al BPS'],
    ['la D G I', 'la DGI'],
    ['cuenta del Brou', 'cuenta del BROU'],
    ['Ose', 'OSE'],
  ])('siglas: %s → %s', (mal, bien) => {
    expect(corregirPalabrasUy(mal)).toBe(bien)
  })

  it('no toca palabras comunes ni lo que ya está bien', () => {
    const iguales = [
      'Pegó un salto y compró flores',
      'treinta y tres años',
      'un durazno en la barra de la cocina',
      'agua de colonia',
      'que no ose tocarlo',
      'Utensilios de cocina',
      'Punta Carretas y Pocitos',
      'Canelones, Maldonado y Montevideo.',
      'Llamar a la Intendencia de Maldonado',
    ]
    for (const t of iguales) expect(corregirPalabrasUy(t)).toBe(t)
  })

  it('el punto final de una frase no se come', () => {
    expect(corregirPalabrasUy('Pagar UTE. Después OSE.')).toBe('Pagar UTE. Después OSE.')
  })

  it('la IA recibe la lista y la regla de corregir lo que suene parecido', () => {
    const s = construirSistema()
    expect(s).toContain('suena parecido a una de esta lista')
    for (const p of [...DEPARTAMENTOS, 'Carrasco', 'Pocitos', 'La Barra', 'Portofino', 'Malibú', 'UTE', 'OSE', 'Antel', 'BPS', 'DGI', 'BROU', 'Intendencia']) {
      expect(PALABRAS_UY).toContain(p)
      expect(s).toContain(p)
    }
  })
})
