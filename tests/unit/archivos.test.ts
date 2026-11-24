import { describe, expect, it } from 'vitest'
import {
  MAX_BYTES, extensionDe, generarPath, validarLectura, validarSubida,
} from '@/domain/archivos'

const ok = { tipo: 'documento', carpetaId: 'c1', titulo: 'Póliza', mime: 'image/jpeg', bytes: 1000 }

describe('validarSubida', () => {
  it('owner sube documento válido', () => {
    expect(validarSubida('owner', ok)).toEqual({ ok: true, valor: { tipo: 'documento', carpetaId: 'c1', titulo: 'Póliza', ext: 'jpg' } })
  })
  it('owner sube foto sin título', () => {
    const r = validarSubida('owner', { tipo: 'foto', mime: 'image/png', bytes: 10 })
    expect(r).toEqual({ ok: true, valor: { tipo: 'foto', ext: 'png' } })
  })
  it('familia solo fotos: documento es 403', () => {
    expect(validarSubida('familia', ok)).toMatchObject({ ok: false, status: 403 })
    expect(validarSubida('familia', { tipo: 'foto', mime: 'image/jpeg', bytes: 1 })).toMatchObject({ ok: true })
  })
  it('tipo inválido', () => {
    expect(validarSubida('owner', { ...ok, tipo: 'otro' })).toMatchObject({ ok: false, status: 400 })
  })
  it('documento sin título', () => {
    expect(validarSubida('owner', { ...ok, titulo: '  ' })).toEqual({ ok: false, status: 400, error: 'Poné un título' })
  })
  it('título muy largo', () => {
    expect(validarSubida('owner', { ...ok, titulo: 'a'.repeat(81) })).toMatchObject({ ok: false, status: 400 })
  })
  it('documento sin carpeta', () => {
    expect(validarSubida('owner', { ...ok, carpetaId: '' })).toMatchObject({ ok: false, status: 400 })
  })
  it('mime no imagen', () => {
    expect(validarSubida('owner', { ...ok, mime: 'application/pdf' })).toMatchObject({ ok: false, status: 400 })
  })
  it('acepta heic y webp', () => {
    expect(validarSubida('owner', { ...ok, mime: 'image/heic' })).toMatchObject({ ok: true })
    expect(validarSubida('owner', { ...ok, mime: 'image/webp' })).toMatchObject({ ok: true })
  })
  it('tamaño: 0 y más de 10 MB', () => {
    expect(validarSubida('owner', { ...ok, bytes: 0 })).toMatchObject({ ok: false, status: 400 })
    expect(validarSubida('owner', { ...ok, bytes: MAX_BYTES + 1 })).toMatchObject({ ok: false, status: 400 })
    expect(validarSubida('owner', { ...ok, bytes: MAX_BYTES })).toMatchObject({ ok: true })
  })
})

describe('generarPath', () => {
  it('documento y foto', () => {
    expect(generarPath('documento', 'jpg', 'c1', 'u')).toBe('documentos/c1/u.jpg')
    expect(generarPath('foto', 'png', undefined, 'u')).toBe('fotos/u.png')
  })
  it('extensiones', () => {
    expect(extensionDe('image/jpeg')).toBe('jpg')
    expect(extensionDe('image/heif')).toBe('heif')
  })
})

describe('validarLectura', () => {
  it('owner lee fotos y documentos', () => {
    expect(validarLectura('owner', ['documentos', 'c1', 'a.jpg'])).toEqual({ ok: true, path: 'documentos/c1/a.jpg' })
    expect(validarLectura('owner', ['fotos', 'a.jpg'])).toEqual({ ok: true, path: 'fotos/a.jpg' })
  })
  it('familia solo fotos', () => {
    expect(validarLectura('familia', ['fotos', 'a.jpg'])).toMatchObject({ ok: true })
    expect(validarLectura('familia', ['documentos', 'c1', 'a.jpg'])).toMatchObject({ ok: false, status: 403 })
  })
  it('rechaza segmentos peligrosos', () => {
    for (const segs of [[], ['fotos', '..', 'documentos', 'x'], ['fotos', ''], ['fotos', 'a\\b'], ['', 'fotos', 'a'], ['fotos', '.'], ['otra', 'a.jpg'], ['fotos']]) {
      expect(validarLectura('owner', segs)).toMatchObject({ ok: false, status: 400 })
    }
  })
  it('familia con .. hacia documentos es 400', () => {
    expect(validarLectura('familia', ['fotos', '..', 'documentos', 'c1', 'a.jpg'])).toMatchObject({ ok: false, status: 400 })
  })
})

import { validarCarpeta, leerFoco } from '@/domain/archivos'
describe('validarCarpeta', () => {
  it('válida, vacía, larga y duplicada', () => {
    expect(validarCarpeta(' Barco ', ['Seguros'])).toEqual({ ok: true, valor: 'Barco' })
    expect(validarCarpeta('', [])).toMatchObject({ ok: false })
    expect(validarCarpeta('a'.repeat(41), [])).toMatchObject({ ok: false })
    expect(validarCarpeta('seguros', ['Seguros'])).toEqual({ ok: false, error: 'Ya existe una carpeta con ese nombre' })
  })
})

describe('leerFoco (encuadre de la foto en el marco de Inicio)', () => {
  it('0..1, redondeado; lo inválido queda centrado', () => {
    expect(leerFoco('0.25')).toBe(0.25)
    expect(leerFoco('0.33333')).toBe(0.333)
    expect(leerFoco('1.7')).toBe(1)
    expect(leerFoco('-3')).toBe(0)
    expect(leerFoco('abc')).toBe(0.5)
    expect(leerFoco(null)).toBe(0.5)
    expect(leerFoco('')).toBe(0.5)
  })
})
