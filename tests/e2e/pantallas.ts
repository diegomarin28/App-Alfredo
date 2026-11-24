import { expect, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { entrarComo, resetear, type Rol } from './helpers'

/** "Hoy" fijo para que los textos (días que faltan, urgencias) salgan siempre iguales. */
export const HOY = '2026-11-22'

const FOTO = readFileSync(path.join(__dirname, 'fixtures', 'foto.jpg'))

/** Datos realistas para recorrer todas las pantallas (los mismos que usan las otras pruebas). */
const DATOS = {
  fechas: [
    { nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 },
    { nombre: 'Luis y Marta', tipo: 'otra', dia: '12-03' },
    { nombre: 'Marta', tipo: 'cumple', dia: '01-10' },
    { nombre: 'Sofía Rodríguez', tipo: 'cumple', dia: '12-08', anioNacimiento: 1985 },
    { nombre: 'Día del abuelo', tipo: 'otra', dia: '11-30' },
  ],
  vencimientos: [
    { titulo: 'Patente camioneta', ambito: 'personal', fecha: '2026-12-31', avisarDiasAntes: 30, hecho: false },
    { titulo: 'Vence el seguro del auto', ambito: 'personal', fecha: '2026-11-29', avisarDiasAntes: 7, hecho: false, loteId: 'lote-contame', creadoEn: '2026-11-22T10:00:01.000Z' },
    { titulo: 'Seguro del local', ambito: 'empresa', fecha: '2026-12-12', avisarDiasAntes: 30, hecho: false },
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
    { titulo: 'Habilitación vieja', ambito: 'empresa', fecha: '2026-11-20', avisarDiasAntes: 7, hecho: false },
    { titulo: 'Ya pagado', ambito: 'empresa', fecha: '2026-11-30', avisarDiasAntes: 7, hecho: true },
  ],
  pendientes: [
    { texto: 'Pagar la luz de Portofino', hecho: false, creadoEn: '2026-11-20T12:00:00.000Z' },
    { texto: 'Llamar al contador por el balance', hecho: false, creadoEn: '2026-11-22T10:00:02.000Z', loteId: 'lote-contame' },
    { texto: 'Renovar la cédula', hecho: true, creadoEn: '2026-11-18T12:00:00.000Z' },
  ],
  notas: [
    { texto: 'Nota vieja de voz', origen: 'voz', creadoEn: '2026-11-10T15:00:00.000Z' },
    { texto: 'Idea para el jardín: plantar un limonero', origen: 'escrita', creadoEn: '2026-11-22T15:00:00.000Z' },
  ],
  gruposContacto: [{ id: 'g-obra', nombre: 'Obra', orden: 1 }, { id: 'g-familia', nombre: 'Familia', orden: 2 }, { id: 'g-casas', nombre: 'Casas', orden: 3 }],
  contactos: [
    { nombre: 'Martín Pérez', grupoId: 'g-obra', empresa: 'Ferretería Sur', telefono: '59899123456', nota: 'Paga a 30 días' },
    { nombre: 'Lucía Gómez', grupoId: 'g-obra', empresa: 'Aberturas Gómez' },
    { nombre: 'Dr. Silva', empresa: 'Escribano', telefono: '59829001234' },
    { nombre: 'Simón', grupoId: 'g-casas', empresa: 'Jardinero', telefono: '59899555111' },
  ],
  personasCasa: [
    { casa: 'portofino', nombre: 'Rosa Díaz', rol: 'Limpieza', detalle: 'Martes y viernes', telefono: '59899123456' },
    { casa: 'portofino', nombre: 'Juan Jardinero', rol: 'Jardín' },
    { casa: 'malibu', nombre: 'Pedro Piscinero', rol: 'Piscina', telefono: '59898765432' },
  ],
  eventosCasa: [
    { casa: 'portofino', que: 'Se cambió el termotanque', cuando: '2026-10-01' },
    { casa: 'portofino', que: 'Pintaron el frente', cuando: '2026-11-20' },
    { casa: 'portofino', que: 'Simón vino a cortar el pasto', cuando: '2026-11-21', loteId: 'lote-contame', creadoEn: '2026-11-22T10:00:00.000Z' },
    { casa: 'malibu', que: 'Limpiaron la piscina', cuando: '2026-11-15' },
  ],
  serviciosCasa: [
    { casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 123456' },
    { casa: 'portofino', clave: 'UTE', valor: 'Cuenta 4455667' },
    { casa: 'malibu', clave: 'OSE', valor: 'Cuenta 777' },
  ],
}

export interface Pantalla {
  /** nombre del archivo de captura y de la prueba */
  nombre: string
  /** quién la mira: sin sesión para las públicas */
  rol: Rol | null
  /** ruta, o 'carpeta' para la primera carpeta de Documentos (su id cambia en cada reset) */
  ruta: string
}

export const PANTALLAS: Pantalla[] = [
  { nombre: 'inicio', rol: 'owner', ruta: '/' },
  { nombre: 'calendario', rol: 'owner', ruta: '/calendario' },
  { nombre: 'recordatorios', rol: 'owner', ruta: '/recordatorios' },
  { nombre: 'contame', rol: 'owner', ruta: '/contame' },
  { nombre: 'mensajes', rol: 'owner', ruta: '/mensajes' },
  { nombre: 'portofino', rol: 'owner', ruta: '/casas' },
  { nombre: 'malibu', rol: 'owner', ruta: '/casas?casa=malibu' },
  { nombre: 'contactos', rol: 'owner', ruta: '/contactos' },
  { nombre: 'vencimientos', rol: 'owner', ruta: '/vencimientos' },
  { nombre: 'pendientes', rol: 'owner', ruta: '/pendientes' },
  { nombre: 'documentos', rol: 'owner', ruta: '/documentos' },
  { nombre: 'carpeta', rol: 'owner', ruta: 'carpeta' },
  { nombre: 'claves', rol: 'owner', ruta: '/claves' },
  { nombre: 'ajustes', rol: 'owner', ruta: '/ajustes' },
  { nombre: 'fotos', rol: 'owner', ruta: '/fotos' },
  { nombre: 'familia-inicio', rol: 'familia', ruta: '/' },
  { nombre: 'familia-calendario', rol: 'familia', ruta: '/calendario' },
  { nombre: 'familia-recordatorios', rol: 'familia', ruta: '/recordatorios' },
  { nombre: 'familia-portofino', rol: 'familia', ruta: '/casas' },
  { nombre: 'familia-malibu', rol: 'familia', ruta: '/casas?casa=malibu' },
  { nombre: 'familia-fotos', rol: 'familia', ruta: '/fotos' },
  { nombre: 'bienvenida', rol: 'owner', ruta: '/bienvenida' },
  { nombre: 'guia', rol: 'owner', ruta: '/guia' },
  { nombre: 'entrar', rol: null, ruta: '/entrar' },
  { nombre: 'configurar', rol: null, ruta: '/configurar' },
  { nombre: 'link-vencido', rol: null, ruta: '/familia' },
  { nombre: 'no-encontrada', rol: 'owner', ruta: '/esto-no-existe' },
]

async function subir(page: Page, campos: Record<string, string>): Promise<void> {
  const res = await page.request.post('/api/archivos', {
    multipart: { ...campos, file: { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: FOTO } },
  })
  expect(res.status(), (await res.text()).slice(0, 200)).toBe(200)
}

/**
 * Carga los datos (con fotos y un documento de verdad) y devuelve el id de la carpeta "Seguros".
 * Una vez por archivo de pruebas: las pantallas se miran sin tocar nada, y así el servidor de desarrollo
 * (que retiene memoria con cada pedido) atiende un pedido por pantalla y no siete.
 */
export async function sembrar(browser: Browser): Promise<string> {
  const page = await browser.newPage()
  await resetear(page, { datos: DATOS, hoy: HOY, config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await subir(page, { tipo: 'foto' })
  await subir(page, { tipo: 'foto' })
  await page.goto('/documentos')
  const href = await page.getByRole('link', { name: 'Seguros' }).getAttribute('href')
  const carpetaId = href!.split('/').pop()!
  await subir(page, { tipo: 'documento', carpetaId, titulo: 'Póliza del auto' })
  await subir(page, { tipo: 'documento', carpetaId, titulo: 'Seguro del local' })
  await page.close()
  return carpetaId
}

/** Entra con el rol de la pantalla y la abre ya lista (fuentes e imágenes cargadas). */
export async function abrir(page: Page, p: Pantalla, carpetaId: string): Promise<void> {
  if (p.rol) await entrarComo(page, p.rol)
  await page.goto(p.ruta === 'carpeta' ? `/documentos/${carpetaId}` : p.ruta)
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((i) => i.decode().catch(() => undefined)))
  })
}
