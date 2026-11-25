import { describe, expect, it } from 'vitest'
import { distancia, fonetica } from '@/domain/fonetica'
import { corregirPalabrasUy } from '@/domain/palabrasUy'
import { corregirNombres } from '@/domain/nombres'

describe('fonética (ronda 9)', () => {
  it('normaliza: minúsculas, sin tildes, sin espacios ni guiones, sin h', () => {
    expect(fonetica('Can Ahillones')).toBe(fonetica('can-ahillones'))
    expect(fonetica('Hola')).toBe('ola')
    expect(fonetica('Río')).toBe('rio')
  })
  it('ll / y / j / g suave suenan igual', () => {
    expect(fonetica('llave')).toBe(fonetica('yave'))
    expect(fonetica('jente')).toBe(fonetica('gente'))
    expect(fonetica('Gericke')).toBe(fonetica('Jerique'))
  })
  it('v/b y z/s/c suave suenan igual; g fuerte y ch no se confunden', () => {
    expect(fonetica('vaca')).toBe(fonetica('baca'))
    expect(fonetica('zapato')).toBe(fonetica('sapato'))
    expect(fonetica('cielo')).toBe(fonetica('sielo'))
    expect(fonetica('guerra')).not.toBe(fonetica('yerra'))
    expect(fonetica('chico')).toBe('chiko')
  })
  it('distancia: una vocal por otra cuesta la mitad', () => {
    expect(distancia('kanayones', 'kanelones')).toBe(1.5)
    expect(distancia('casa', 'cosa')).toBe(0.5)
    expect(distancia('antes', 'antel')).toBe(1)
  })
})

describe('Canelones y nombres por cómo suenan (ronda 9)', () => {
  it.each(['Can Ahillones', 'can-agilones', 'cana jones'])('"%s" → "Canelones"', (mal) => {
    expect(corregirPalabrasUy(`Mañana voy a ${mal} con Pau.`)).toBe('Mañana voy a Canelones con Pau.')
    expect(corregirNombres(mal)).toBe('Canelones')
  })

  it('"Henrique" → "Gericke" (y "Enrique" solo después de un nombre de la familia)', () => {
    expect(corregirNombres('Llamar a Henrique')).toBe('Llamar a Gericke')
    expect(corregirNombres('Pau Henrique')).toBe('Pau Gericke')
    expect(corregirNombres('Pau Enrique')).toBe('Pau Gericke')
    expect(corregirNombres('Enrique, el electricista')).toBe('Enrique, el electricista')
  })

  it('el apellido y los nombres de la familia por cómo suenan', () => {
    expect(corregirNombres('Santiago Jerique')).toBe('Santiago Gericke')
    expect(corregirNombres('Eujenia y Alvaro')).toBe('Eugenia y Álvaro')
    expect(corregirNombres('Ignasio')).toBe('Ignacio')
    // la familia sumada de lo guardado
    expect(corregirNombres('Sofia viene', ['Sofía Gericke'])).toBe('Sofía viene')
  })

  it.each([
    ['Maldo nado', 'Maldonado'],
    ['monte video', 'Montevideo'],
    ['Mondevideo', 'Montevideo'],
    ['Pay sandu', 'Paysandú'],
    ['Paisandú', 'Paysandú'],
    ['Tacuarenbo', 'Tacuarembó'],
    ['La Valleja', 'Lavalleja'],
    ['Pirápolis', 'Piriápolis'],
    ['Punta de Este', 'Punta del Este'],
    ['Puntas Carretas', 'Punta Carretas'],
    ['Porto Fino', 'Portofino'],
    ['Carasco', 'Carrasco'],
    ['Manan tiales', 'Manantiales'],
    ['Malibu', 'Malibú'],
  ])('%s → %s', (mal, bien) => {
    expect(corregirPalabrasUy(mal)).toBe(bien)
  })

  it('no se come la palabra de al lado', () => {
    expect(corregirPalabrasUy('fui a Maldo nado y a Can Ahillones')).toBe('fui a Maldonado y a Canelones')
    expect(corregirPalabrasUy('de Montevideo a Punta de Este')).toBe('de Montevideo a Punta del Este')
    expect(corregirPalabrasUy('Salto 2')).toBe('Salto 2')
  })

  it('palabras comunes no cambian', () => {
    const iguales = [
      'Comí canelones con la familia',
      'Hay que limpiar los canales y las canillas',
      'Antes de ir, mandale un mensaje',
      'Pegó un salto y compró flores',
      'treinta y tres años',
      'un durazno en la barra de la cocina',
      'agua de colonia',
      'la ribera del río',
      'Los manantiales del campo',
      'que no ose tocarlo',
      'Utensilios de cocina',
      'Cambiar la cerradura de la puerta del fondo',
      'Pagar la cuota del colegio el lunes',
      'Llevar el auto al taller mañana',
      'Comprar pilas, leche y pan',
      'Llamar al jardinero para cortar el pasto',
      'Se rompió la canilla del baño',
      'Renovar el pasaporte antes de viajar',
      'La reunión es el jueves a las diez',
      'Mandarle flores a la tía',
      'Revisar las cañerías del sótano',
      'Mañana pasa el técnico del aire',
      'el cumpleaños de Santiago es el sábado',
      'Pedirle al portero las llaves',
      'Llevar a Pau al médico',
      'Pagar la luz y el agua',
      'Comprar caramelos y chocolates',
      'Montar la carpa en el campo',
      'Ir al banco a depositar',
      'La gente del edificio',
      'Mandar a arreglar la heladera',
      'Hablar con el abogado sobre la herencia',
      'Alguien que trabaja o se ocupa de algo en una casa',
      'La lista trae más de mil filas paginando',
      'O se arregla o se cambia',
    ]
    for (const t of iguales) expect(corregirNombres(t)).toBe(t)
  })
})
