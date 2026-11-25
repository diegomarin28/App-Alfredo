import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

const HOY = '2026-11-22'
const DATOS = {
  fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }],
  vencimientos: [{ titulo: 'Seguro camioneta', ambito: 'personal', fecha: '2026-11-27', avisarDiasAntes: 7, hecho: false }],
  pendientes: [1, 2, 3].map((n) => ({ texto: `Pendiente ${n}`, hecho: false, creadoEn: '2026-11-20T10:00:00Z' })),
  fotos: [{ path: 'fotos/a.jpg' }, { path: 'fotos/b.jpg' }],
}

test('owner: saludo, foto, lo próximo y accesos', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await expect(page.getByText('Domingo 22 de noviembre')).toBeVisible()
  await expect(page.locator('img[src*="fotos/"]')).toHaveCount(1)
  const prox = page.getByRole('region', { name: 'Lo próximo' })
  await expect(prox).toContainText('Cumple de Ana')
  await expect(prox).toContainText('En 3 días')
  await expect(prox).toContainText('Vence en 5 días')
  await expect(prox).toContainText('3 tareas pendientes')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav).toBeVisible()
  // Etiquetas a 14 px en la barra de abajo (menú compacto) y 16 px en la barra lateral, sin desbordar su lugar
  // ni en el teléfono más angosto.
  const ancho = page.viewportSize()!.width
  for (const n of ['Inicio', 'Calendario', 'Mensajes', 'Casas']) {
    const link = nav.getByRole('link', { name: n })
    expect(await link.evaluate((el) => getComputedStyle(el).fontSize), n).toBe(ancho >= 1024 ? '16px' : '14px')
    const span = link.locator('span')
    expect(await span.evaluate((el) => el.getBoundingClientRect().width <= el.parentElement!.getBoundingClientRect().width), n).toBe(true)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho)
})

for (const [nombre, ruta] of [
  ['Vencimientos', '/vencimientos'], ['Tareas pendientes', '/pendientes'], ['Recordatorios', '/recordatorios'],
  ['Contactos', '/contactos'], ['Documentos', '/documentos'], ['Contraseñas', '/claves'], ['Fotos', '/fotos'],
]) {
  test(`acceso ${nombre} navega`, async ({ page }) => {
    await resetear(page, { datos: DATOS, hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/')
    await page.getByRole('link', { name: nombre, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`${ruta}$`))
  })
}

test('repo vacío: Inicio muestra textos vacíos y sin "Lo próximo" (ronda 6)', async ({ page }) => {
  await resetear(page, { sinSeed: true, hoy: HOY })
  await entrarComo(page, 'owner')
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  // por rol: mientras Next transmite la página, una copia oculta (<div hidden id="S:…">) también tiene el texto
  await expect(page.getByRole('region', { name: 'Foto del día' }).getByText('Todavía no hay fotos')).toBeVisible()
  await expect(page.getByRole('link', { name: /Agregar fotos/ })).toHaveAttribute('href', '/fotos')
  // ronda 6: sin nada en ninguna fila, no hay sección
  await expect(page.getByRole('navigation', { name: 'Accesos directos' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lo próximo' })).toHaveCount(0)
  await expect(page.getByText('No hay vencimientos pendientes')).toHaveCount(0)
})

test('ronda 6: "Lo próximo" muestra solo las filas que tienen algo; 1 tarea, cumple 1 año', async ({ page }) => {
  await resetear(page, {
    hoy: HOY,
    datos: {
      fechas: [{ nombre: 'Benja', tipo: 'cumple', dia: '11-23', anioNacimiento: 2025 }],
      pendientes: [{ texto: 'Una sola', hecho: false, creadoEn: '2026-11-20T10:00:00Z' }],
    },
  })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const prox = page.getByRole('region', { name: 'Lo próximo' })
  await expect(prox.getByRole('listitem')).toHaveCount(2)
  await expect(prox).toContainText('Mañana · cumple 1 año')
  await expect(prox).toContainText('1 tarea pendiente')
  await expect(prox).not.toContainText('tareas')
  await expect(prox).not.toContainText('No hay')
  await page.goto('/calendario')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Benja' })).toContainText('Cumpleaños · cumple 1 año')
})

test('familia: "Cargando datos para Alfredo" con lo cargado de cada cosa; sin accesos ni Contame/Mensajes', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/')
  await expect(page.getByRole('note')).toContainText('Modo carga · el link vence el')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cargando datos para Alfredo')
  const cargar = page.getByRole('navigation', { name: 'Qué cargar' })
  await expect(cargar.getByRole('link', { name: /Cumpleaños y fechas/ })).toContainText('1 cargada')
  await expect(cargar.getByRole('link', { name: /Fotos de la familia/ })).toContainText('2 fotos')
  await expect(cargar.getByRole('link', { name: /Portofino y Malibú/ })).toHaveAttribute('href', '/casas')
  await expect(cargar.getByRole('link', { name: /Recordatorios/ })).toContainText('6 cargados')
  for (const n of ['Vencimientos', 'Tareas pendientes', 'Documentos', 'Contraseñas', 'Contactos']) {
    await expect(page.getByRole('link', { name: n, exact: true })).toHaveCount(0)
  }
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await expect(menu.getByRole('link')).toHaveText(['Inicio', 'Fechas', 'Fotos', 'Casas'])
  await expect(page.getByRole('link', { name: 'Hablar con el asistente' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Mensajes' })).toHaveCount(0)
})

test('owner: con una foto, Inicio lleva a /fotos (la foto y el botón de agregar)', async ({ page }) => {
  await resetear(page, { datos: { fotos: [{ path: 'fotos/a.jpg' }] }, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const foto = page.getByRole('link', { name: 'Foto familiar del día' })
  await expect(foto).toHaveAttribute('href', '/fotos')
  const agregar = page.getByRole('link', { name: 'Agregar fotos' })
  await expect(agregar).toHaveAttribute('href', '/fotos')
  const caja = (await agregar.boundingBox())!
  expect(caja.height).toBeGreaterThanOrEqual(44)
  expect(caja.width).toBeGreaterThanOrEqual(44)
  await foto.click()
  await expect(page).toHaveURL(/\/fotos$/)
  await expect(page.getByRole('heading', { name: 'Fotos' })).toBeVisible()
})

test('accesos: 7 con Fotos al final a todo el ancho; "Tareas pendientes" entra entera, sin "…"', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const accesos = page.getByRole('navigation', { name: 'Accesos directos' }).getByRole('link')
  await expect(accesos).toHaveText(['Vencimientos', 'Tareas pendientes', 'Recordatorios', 'Contactos', 'Documentos', 'Contraseñas', 'Fotos'])
  const fotos = (await accesos.last().boundingBox())!, primero = (await accesos.first().boundingBox())!, segundo = (await accesos.nth(1).boundingBox())!
  expect(fotos.width).toBeGreaterThan(segundo.x + segundo.width - primero.x - 2)
  // ninguna palabra se corta a la mitad ni queda con "…": cada palabra entera en un renglón, dentro del botón
  for (const a of await accesos.all()) {
    const nombre = (await a.textContent())!
    const ok = await a.locator('span').last().evaluate((el) => {
      const r = document.createRange()
      const palabras: { texto: string; renglones: number }[] = []
      const nodo = el.firstChild as Text
      let i = 0
      for (const p of nodo.data.split(' ')) {
        r.setStart(nodo, i); r.setEnd(nodo, i + p.length); i += p.length + 1
        const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top)))
        palabras.push({ texto: p, renglones: tops.size })
      }
      const caja = el.parentElement!.getBoundingClientRect(), texto = el.getBoundingClientRect()
      return palabras.every((p) => p.renglones === 1) && texto.right <= caja.right + 1 && getComputedStyle(el).textOverflow !== 'ellipsis'
    })
    expect(ok, nombre).toBe(true)
  }
})
