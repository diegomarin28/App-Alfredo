import { test, expect, type Page } from '@playwright/test'
import { entrarComo, guion, hidratado, instalarVozFalsa, resetear } from './helpers'

// Detalles personales (mockup v2, ronda 3) y los arreglos de la revisión de capturas.

const HOY = '2026-11-22'
const pendiente = (texto: string, hecho = false) => ({ texto, hecho, creadoEn: '2026-11-20T12:00:00.000Z' })

/** Tilda un pendiente abierto por su texto. */
async function tildar(page: Page, texto: string) {
  const c = page.getByRole('region', { name: 'Por hacer' }).getByRole('checkbox', { name: texto })
  await hidratado(c)
  await c.click()
  await expect(page.getByRole('region', { name: 'Por hacer' }).getByText(texto)).toHaveCount(0)
}

test.describe('golf y truco en Pendientes', () => {
  test.beforeEach(async ({ page }) => {
    // la cuenta de la Flor vive en el teléfono: cada prueba arranca de cero
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('limpio')) { localStorage.clear(); sessionStorage.setItem('limpio', '1') } } catch { /* nada */ } })
  })

  test('al tildar el último, la pelota entra al hoyo: "Todo al día · Hoyo en uno"; al volver, el hoyo quieto', async ({ page }) => {
    await resetear(page, { hoy: HOY, config: { nombre: 'Alfredo' }, datos: { pendientes: [pendiente('Pagar la luz')] } })
    await entrarComo(page, 'owner')
    await page.goto('/pendientes')
    await tildar(page, 'Pagar la luz')
    const golf = page.locator('[data-detalle="golf"]')
    await expect(golf).toHaveAttribute('data-animando', 'true')
    await expect(golf.getByRole('img', { name: 'Una pelota de golf en el hoyo' })).toBeVisible()
    await expect(golf).toContainText('Todo al día')
    await expect(golf).toContainText('Hoyo en uno, Alfredo.')
    await page.reload()
    await expect(page.locator('[data-detalle="golf"]')).not.toHaveAttribute('data-animando', 'true')
    await expect(page.getByText('Todo al día')).toBeVisible()
  })

  test('el tercero del día: ¡Flor! (una vez por día); si es el último, después el golf', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { pendientes: [pendiente('Uno'), pendiente('Dos'), pendiente('Tres'), pendiente('Cuatro')] } })
    await entrarComo(page, 'owner')
    await page.goto('/pendientes')
    await tildar(page, 'Uno')
    await tildar(page, 'Dos')
    await expect(page.locator('[data-detalle="flor"]')).toHaveCount(0)
    await tildar(page, 'Tres')
    const flor = page.locator('[data-detalle="flor"]')
    await expect(flor).toContainText('¡Flor!')
    await expect(flor).toContainText('Tres resueltos en el día.')
    // no bloquea: se puede seguir tocando mientras está
    await tildar(page, 'Cuatro')
    // el último: el golf ("Todo al día") no se ve detrás de la Flor; aparece cuando ella se va
    await expect(page.locator('[data-detalle="golf"]')).toHaveCount(0)
    await expect(flor).toHaveCount(0, { timeout: 5000 })
    await expect(page.locator('[data-detalle="golf"]')).toHaveAttribute('data-animando', 'true')

    // una vez por día: reabrir y volver a tildar no la repite
    await page.getByText('Hechos (4)').click()
    await page.getByRole('region', { name: 'Hechos' }).getByRole('checkbox', { name: 'Tres' }).click()
    await tildar(page, 'Tres')
    await expect(page.locator('[data-detalle="flor"]')).toHaveCount(0)
  })

  test('si el tercero es también el último: primero la Flor sola (sin "Todo al día" detrás) y después el golf', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { pendientes: [pendiente('Uno'), pendiente('Dos'), pendiente('Tres')] } })
    await entrarComo(page, 'owner')
    await page.goto('/pendientes')
    await tildar(page, 'Uno')
    await tildar(page, 'Dos')
    await tildar(page, 'Tres')
    await expect(page.locator('[data-detalle="flor"]')).toBeVisible()
    await expect(page.getByText('Todo al día')).toHaveCount(0)
    await expect(page.locator('[data-detalle="golf"]')).toHaveCount(0)
    await expect(page.locator('[data-detalle="flor"]')).toHaveCount(0, { timeout: 5000 })
    const golf = page.locator('[data-detalle="golf"]')
    await expect(golf).toHaveAttribute('data-animando', 'true')
    await expect(golf).toContainText('Todo al día')
  })
})

test('Vencimientos sin nada pendiente: el swing y "Nada por vencer · Vas bajo par"', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const swing = page.locator('[data-detalle="swing"]')
  await expect(swing.getByRole('img', { name: 'Un palo de golf golpea la pelota' })).toBeVisible()
  await expect(swing).toContainText('Nada por vencer')
  await expect(swing).toContainText('Todo en regla. Vas bajo par.')
})

test('Contame guardando: la pelota de pádel rebota con "Guardando…"', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.addInitScript(instalarVozFalsa)
  await guion(page, [{ texto: '', toolName: 'guardar', toolInput: { acciones: [{ tipo: 'pendiente', texto: 'Comprar pilas' }] } }])
  let soltar!: () => void
  const espera = new Promise<void>((r) => { soltar = r })
  await page.route('**/api/ai/contame', async (ruta) => { await espera; await ruta.continue() })
  await page.goto('/contame')
  const escribir = page.getByRole('button', { name: 'Prefiero escribir' })
  await hidratado(escribir)
  await escribir.click()
  await page.getByLabel('Escribí o dictá con el teclado').fill('Comprar pilas')
  await page.getByRole('button', { name: 'Enviar' }).click()
  const padel = page.locator('[data-detalle="padel"]')
  await expect(padel).toContainText('Guardando')
  await expect(padel).toContainText('Estoy ordenando lo que me contaste.')
  soltar()
  await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
  await expect(padel).toHaveCount(0)
})

test('Mensajes: pádel mientras sugiere la respuesta y dados con "Otra versión"', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await guion(page, [{ texto: 'Estimado Martín: el viernes cerramos.' }, { texto: 'Martín, confirmado para el viernes.' }])
  let soltar: () => void = () => {}
  await page.route('**/api/ai/mensajes', async (ruta) => { await new Promise<void>((r) => { soltar = r }); await ruta.continue() })
  await page.goto('/mensajes')
  const sugerir = page.getByRole('button', { name: 'Sugerir respuesta' })
  await hidratado(sugerir)
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes?')
  await sugerir.click()
  await expect(page.locator('[data-detalle="padel"]')).toContainText('Escribiendo')
  soltar()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue('Estimado Martín: el viernes cerramos.')
  await page.getByRole('button', { name: 'Otra versión' }).click()
  await expect(page.getByRole('img', { name: 'Se tiran dos dados' })).toBeVisible()
  await expect(page.locator('[data-detalle="padel"]')).toHaveCount(0)
  soltar()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue('Martín, confirmado para el viernes.')
  await expect(page.getByRole('img', { name: 'Se tiran dos dados' })).toHaveCount(0)
})

test.describe('whisky: el 25 de noviembre', () => {
  test('al abrir la app ese día, dos vasos brindan "¡Salud, Alfredo!"; Gracias lo cierra y no vuelve ese día', async ({ page }) => {
    await resetear(page, { hoy: '2026-11-25', config: { nombre: 'Alfredo' } })
    await entrarComo(page, 'owner')
    await page.goto('/')
    const brindis = page.getByRole('region', { name: 'Brindis de cumpleaños' })
    await expect(brindis.getByRole('img', { name: 'Dos vasos de whisky brindan' })).toBeVisible()
    await expect(brindis).toContainText('¡Salud, Alfredo!')
    await expect(brindis).toContainText('Feliz cumpleaños.')
    // no tapa: se puede tocar lo de abajo
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Calendario' })).toBeVisible()
    const gracias = brindis.getByRole('button', { name: 'Gracias' })
    await hidratado(gracias)
    await gracias.click()
    await expect(brindis).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
    await expect(page.getByRole('region', { name: 'Brindis de cumpleaños' })).toHaveCount(0)
  })

  test('otro día no hay brindis, y la familia no lo ve', async ({ page }) => {
    await resetear(page, { hoy: '2026-11-24' })
    await entrarComo(page, 'owner')
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Brindis de cumpleaños' })).toHaveCount(0)
    await resetear(page, { hoy: '2026-11-25' })
    await entrarComo(page, 'familia')
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Brindis de cumpleaños' })).toHaveCount(0)
  })

  test('arriba de la Bienvenida también brindan (y después, ese día, no se repite en Inicio)', async ({ page }) => {
    await resetear(page, { hoy: '2026-11-25', config: { bienvenidaVista: false } })
    await entrarComo(page, 'owner')
    await page.goto('/')
    await expect(page).toHaveURL(/\/bienvenida$/)
    await expect(page.getByRole('img', { name: 'Dos vasos de whisky brindan' })).toBeVisible()
    await page.getByRole('link', { name: 'Ver qué puede hacer' }).click()
    const saltar = page.getByRole('button', { name: 'Saltar' })
    await hidratado(saltar)
    await saltar.click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Brindis de cumpleaños' })).toHaveCount(0)
  })
})

test('Inicio: deslizar hacia abajo para actualizar muestra el hielo cayendo en el vaso', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize()!.width >= 1024, 'gesto del teléfono')
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await hidratado(page.getByRole('link', { name: 'Ajustes' }))
  const pudo = await page.evaluate(async () => {
    // Chromium crea toques con `new Touch`; WebKit, con el viejo document.createTouch.
    const toque = (y: number): Touch[] | null => {
      try { return [new Touch({ identifier: 1, target: document.body, clientX: 150, clientY: y })] } catch { /* WebKit */ }
      try {
        const crear = (document as unknown as { createTouch: (...a: unknown[]) => Touch }).createTouch
        return [crear.call(document, window, document.body, 1, 150, y, 150, y)]
      } catch { return null }
    }
    if (!toque(0)) return false
    // WebKit pide TouchList (document.createTouchList); Chromium acepta listas comunes.
    const comoLista = (ts: Touch[]) => {
      const crear = (document as unknown as { createTouchList?: (...t: Touch[]) => TouchList }).createTouchList
      return (typeof crear === 'function' ? crear.call(document, ...ts) : ts) as unknown as Touch[]
    }
    const disparar = (tipo: string, y: number) => {
      const lista = comoLista(tipo === 'touchend' ? [] : toque(y)!)
      window.dispatchEvent(new TouchEvent(tipo, { touches: lista, changedTouches: comoLista(toque(y)!), bubbles: true }))
    }
    disparar('touchstart', 100)
    for (const y of [140, 200, 260, 320]) disparar('touchmove', y)
    await new Promise((r) => setTimeout(r, 50))
    disparar('touchend', 320)
    return true
  })
  test.skip(!pudo, 'este navegador de pruebas no permite crear toques (Touch)')
  await expect(page.getByRole('img', { name: 'Un hielo cae en el vaso' })).toBeVisible()
  await expect(page.getByText('Actualizando')).toBeVisible()
  await expect(page.getByText('Actualizando')).toHaveCount(0, { timeout: 5000 })
})

test.describe('con "reducir movimiento": el cuadro final, sin moverse', () => {
  test.use({ reducedMotion: 'reduce' })
  test('el golf queda quieto con la pelota ya en el hoyo', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { pendientes: [pendiente('Pagar la luz')] } })
    await entrarComo(page, 'owner')
    await page.goto('/pendientes')
    await tildar(page, 'Pagar la luz')
    const pelota = page.locator('[data-detalle="golf"] .dt-pelota')
    expect(await pelota.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).opacity])).toEqual(['none', '0'])
    await expect(page.getByText('Hoyo en uno, Alfredo.')).toBeVisible()
  })
})

test.describe('ronda 3: arreglos de la revisión de capturas', () => {
  test('"‹ Volver": la flecha de volver apunta a la izquierda', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/documentos')
    await page.getByRole('link', { name: /^Seguros/ }).click()
    // ronda 5: "‹ Documentos" pasó a ser "‹ Volver"
    const volver = page.getByRole('link', { name: 'Volver' })
    await expect(volver.locator('path')).toHaveAttribute('d', 'M15 6l-6 6 6 6')
  })

  test('los cuadros de texto no se estiran a mano y crecen solos', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/ajustes')
    const estilo = page.getByLabel('Cómo escribís')
    await hidratado(estilo)
    await expect(estilo).toHaveCSS('resize', 'none')
    const antes = (await estilo.boundingBox())!.height
    await estilo.fill(Array.from({ length: 12 }, (_, i) => `Línea ${i + 1}: hola Martín, el viernes lo cerramos.`).join('\n'))
    await expect.poll(async () => (await estilo.boundingBox())!.height).toBeGreaterThan(antes + 100)
  })

  test('Casas: el subtítulo de una persona va en una sola línea, y llamar/borrar caben en 44 px', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { personasCasa: [
      { casa: 'portofino', nombre: 'Rosa Díaz', rol: 'Limpieza', detalle: 'Martes y viernes de mañana, y algunos sábados', telefono: '59899123456' },
    ] } })
    await entrarComo(page, 'owner')
    await page.goto('/casas')
    const fila = page.getByRole('listitem').filter({ hasText: 'Rosa Díaz' })
    const sub = fila.getByText(/^Limpieza · Martes/)
    await expect(sub).toHaveCSS('white-space', 'nowrap')
    await expect(sub).toHaveCSS('text-overflow', 'ellipsis')
    for (const nombre of ['Llamar', 'Borrar Rosa Díaz']) {
      const c = (await fila.getByRole(nombre === 'Llamar' ? 'link' : 'button', { name: nombre }).boundingBox())!
      expect(Math.round(c.width), nombre).toBe(44)
      expect(Math.round(c.height), nombre).toBe(44)
    }
  })

  test('Contraseñas bloqueada: candado grande y texto corto', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/claves')
    await expect(page.getByText('Solo se abren con tu Face ID. Se cierran solas a los 2 minutos.')).toBeVisible()
    await expect(page.getByText(/bajo llave/)).toHaveCount(0)
  })

  test('Contactos: "+ Grupo" se ve entero al deslizar los grupos', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { gruposContacto: ['Obra', 'Familia', 'Casas', 'Escribanía', 'Médicos'].map((nombre, i) => ({ nombre, orden: i + 1 })) } })
    await entrarComo(page, 'owner')
    await page.goto('/contactos')
    const fila = page.getByRole('group', { name: 'Filtrar por grupo' })
    const grupo = fila.getByRole('button', { name: 'Grupo' })
    await grupo.scrollIntoViewIfNeeded()
    await fila.evaluate((el) => { el.scrollLeft = el.scrollWidth })
    const caja = (await grupo.boundingBox())!
    const ventana = page.viewportSize()!.width
    expect(caja.x).toBeGreaterThanOrEqual(0)
    expect(caja.x + caja.width).toBeLessThanOrEqual(ventana - 8)
  })
})
