// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { esApi, esPublica, familiaVence, puedeVer, sesionVigente } from '@/auth/access'
import { codigoIgual } from '@/auth/codigos'
import { rutasDePruebaHabilitadas } from '@/auth/pruebas'

const ANTES = new Date('2026-11-22T12:00:00-03:00')
const VENCIDO = new Date('2026-11-26T00:00:00-03:00')

afterEach(() => vi.unstubAllEnvs())

describe('puedeVer', () => {
  it('owner ve todo, incluso /claves', () => {
    for (const p of ['/', '/claves', '/documentos', '/contactos', '/vencimientos', '/mensajes', '/contame', '/api/ai/mensajes', '/api/claves']) {
      expect(puedeVer('owner', p, ANTES)).toBe(true)
    }
  })

  it('familia ve Inicio, Calendario, Recordatorios, Casas, Fotos y sus APIs', () => {
    for (const p of [
      '/', '/calendario', '/casas', '/casas/malibu', '/recordatorios', '/fotos',
      '/api/fechas', '/api/recordatorios/123', '/api/casas', '/api/fotos', '/api/archivos/fotos/a.jpg',
    ]) {
      expect(puedeVer('familia', p, ANTES), p).toBe(true)
    }
  })

  it('familia no ve lo prohibido', () => {
    for (const p of [
      '/claves', '/documentos', '/contactos', '/vencimientos', '/mensajes', '/contame',
      '/pendientes', '/api/ai/mensajes', '/api/claves', '/api/documentos', '/api/contactos',
      '/api/vencimientos', '/api/pendientes', '/calendariox', '/fotosecretas', '/api/fechasx',
    ]) {
      expect(puedeVer('familia', p, ANTES), p).toBe(false)
    }
  })

  it('la familia queda afuera de todo desde el vencimiento (por defecto 25/11 23:59)', () => {
    vi.stubEnv('FAMILY_EXPIRES_AT', '')
    expect(puedeVer('familia', '/calendario', new Date('2026-11-25T23:58:59-03:00'))).toBe(true)
    for (const p of ['/', '/calendario', '/casas', '/recordatorios', '/fotos', '/api/fechas']) {
      expect(puedeVer('familia', p, VENCIDO), p).toBe(false)
    }
    expect(puedeVer('familia', '/', new Date('2026-11-25T23:59:00-03:00'))).toBe(false)
    expect(puedeVer('owner', '/', VENCIDO)).toBe(true)
  })

  it('FAMILY_EXPIRES_AT del entorno manda; uno inválido cierra todo', () => {
    vi.stubEnv('FAMILY_EXPIRES_AT', '2099-12-31T23:59:00-03:00')
    expect(puedeVer('familia', '/calendario', VENCIDO)).toBe(true)
    vi.stubEnv('FAMILY_EXPIRES_AT', 'cualquier cosa')
    expect(puedeVer('familia', '/calendario', ANTES)).toBe(false)
  })

  it('sin sesión no ve nada (ni /)', () => {
    for (const p of ['/', '/calendario', '/claves', '/api/fechas']) expect(puedeVer(null, p, ANTES)).toBe(false)
  })
})

describe('familiaVence', () => {
  it('por defecto es el miércoles 25/11/2026 23:59 de Montevideo', () => {
    vi.stubEnv('FAMILY_EXPIRES_AT', '')
    expect(familiaVence().toISOString()).toBe('2026-11-26T02:59:00.000Z')
  })
})

describe('esPublica / esApi', () => {
  it('clasifica rutas públicas', () => {
    for (const p of [
      '/entrar', '/configurar', '/familia', '/api/auth/entrar/opciones', '/api/auth/salir',
      '/api/cron/avisos', '/api/test/reset', '/_next/static/chunks/a.js', '/manifest.webmanifest',
      '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png',
      '/sw.js', '/favicon.ico',
    ]) {
      expect(esPublica(p), p).toBe(true)
    }
    for (const p of ['/', '/entrarx', '/claves', '/api/authx', '/api/fechas', '/icon-192.png/x', '/configurar-otra', '/api/testing']) {
      expect(esPublica(p), p).toBe(false)
    }
  })

  it('distingue APIs de páginas', () => {
    expect(esApi('/api/fechas')).toBe(true)
    expect(esApi('/api')).toBe(true)
    expect(esApi('/apis')).toBe(false)
    expect(esApi('/calendario')).toBe(false)
  })
})

describe('sesionVigente', () => {
  it('acepta owner y familia vigente; descarta basura y familia vencida', () => {
    vi.stubEnv('FAMILY_EXPIRES_AT', '')
    expect(sesionVigente({ rol: 'owner' }, VENCIDO)).toEqual({ rol: 'owner' })
    expect(sesionVigente({ rol: 'familia', expira: '2026-11-25T23:59:00-03:00' }, ANTES)).toEqual({
      rol: 'familia', expira: '2026-11-25T23:59:00-03:00',
    })
    expect(sesionVigente({ rol: 'familia', expira: '2026-11-25T23:59:00-03:00' }, VENCIDO)).toBeNull()
    expect(sesionVigente({ rol: 'familia', expira: '2026-11-22T11:00:00-03:00' }, ANTES)).toBeNull()
    expect(sesionVigente({ rol: 'familia', expira: 'basura' }, ANTES)).toBeNull()
    expect(sesionVigente({ rol: 'admin' }, ANTES)).toBeNull()
    expect(sesionVigente({}, ANTES)).toBeNull()
    expect(sesionVigente(null, ANTES)).toBeNull()
  })
})

describe('codigoIgual', () => {
  it('compara exacto y falla cerrado si no hay código esperado', () => {
    expect(codigoIgual('abc123', 'abc123')).toBe(true)
    expect(codigoIgual('abc124', 'abc123')).toBe(false)
    expect(codigoIgual('abc', 'abc123')).toBe(false)
    expect(codigoIgual('', '')).toBe(false)
    expect(codigoIgual('x', undefined)).toBe(false)
    expect(codigoIgual(undefined, 'x')).toBe(false)
  })
})

describe('rutasDePruebaHabilitadas', () => {
  it('solo con ENABLE_TEST_ROUTES=1, fuera de producción y con datos en memoria', () => {
    expect(rutasDePruebaHabilitadas({ ENABLE_TEST_ROUTES: '1', NODE_ENV: 'development' })).toBe(true)
    expect(rutasDePruebaHabilitadas({ ENABLE_TEST_ROUTES: '1', NODE_ENV: 'test', DATA_BACKEND: 'memory' })).toBe(true)
    expect(rutasDePruebaHabilitadas({ ENABLE_TEST_ROUTES: '1', NODE_ENV: 'production' })).toBe(false)
    expect(rutasDePruebaHabilitadas({ ENABLE_TEST_ROUTES: '1', NODE_ENV: 'development', DATA_BACKEND: 'supabase' })).toBe(false)
    expect(rutasDePruebaHabilitadas({ ENABLE_TEST_ROUTES: 'true', NODE_ENV: 'development' })).toBe(false)
    expect(rutasDePruebaHabilitadas({ NODE_ENV: 'development' })).toBe(false)
  })
})
