import { devices, expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { entrarComo, guion, hidratado, resetear } from './helpers'

// Ronda 7: "No entendí" editable y fechas fuera del texto.
// Con SALIDA=<carpeta> corre como iPhone 15 en WebKit y deja capturas.
const SALIDA = process.env.SALIDA
if (SALIDA) test.use({ ...devices['iPhone 15'], browserName: 'webkit', viewport: { width: 393, height: 852 } })

const HOY = '2026-11-24' // martes
const ISO = /\d{4}-\d{2}-\d{2}/

async function captura(page: Page, nombre: string) {
  if (!SALIDA) return
  await page.waitForTimeout(600) // que terminen las animaciones de la hoja
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), animations: 'disabled' })
}

test.beforeEach(async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
})

async function dictarEscrito(page: Page, texto: string) {
  await page.goto('/contame')
  const escribir = page.getByRole('button', { name: 'Prefiero escribir' })
  await hidratado(escribir)
  await escribir.click()
  await page.getByLabel('Lo que querés guardar').fill(texto)
  await page.getByRole('button', { name: 'Listo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Esto es lo que entendí' })).toBeVisible()
}

test('Contame: fechas fuera del texto, el evento al Calendario y "No entendí" editable', async ({ page: contame }) => {
  let page = contame
  await guion(page, [{
    texto: '', toolName: 'guardar',
    toolInput: {
      acciones: [
        // la IA metió la fecha en el texto: se saca y va aparte
        { tipo: 'pendiente', texto: 'El lunes 2026-11-30 ir a Canelones a buscar los papeles' },
        { tipo: 'evento', titulo: 'Reunión en Canelones', fecha: '2026-11-30', hora: '10:30' },
      ],
      noEntendi: ['el coso del garaje', 'lo de la moto'],
    },
  }])
  await dictarEscrito(page, 'El lunes tengo reunión en Canelones a las diez y media, aprovecho a buscar los papeles. El coso del garaje. Lo de la moto.')

  const filas = page.getByRole('list', { name: 'Lo que voy a guardar' }).locator('[data-fila]')
  await expect(filas).toHaveCount(2)
  await expect(filas.nth(0)).toContainText('Ir a Canelones a buscar los papeles (lunes 30/11)')
  await expect(filas.nth(0)).toContainText('Tareas pendientes')
  await expect(filas.nth(1)).toContainText('Reunión en Canelones (lunes 30/11, 10:30)')
  await expect(filas.nth(1)).toContainText('Calendario')
  await expect(page.locator('main')).not.toContainText(ISO)
  const dudas = page.getByRole('list', { name: 'Lo que no entendí' }).locator('[data-duda]')
  await expect(dudas).toHaveCount(2)
  await captura(page, '1-contame-revision')

  // tocar "No entendí": la misma hoja que las otras filas; arranca como tarea
  await page.getByRole('button', { name: 'Corregir: el coso del garaje' }).click()
  const hoja = page.getByRole('dialog', { name: 'Corregir' })
  await expect(hoja.getByLabel('Va en')).toHaveValue('pendiente')
  await expect(hoja.getByLabel('Qué hay que hacer')).toHaveValue('el coso del garaje')
  await expect(hoja.getByLabel('Para cuándo (opcional)')).toHaveValue('')
  await hoja.getByLabel('Va en').selectOption('unaVez')
  await hoja.getByLabel('Qué es').fill('Arreglar el garaje')
  await hoja.getByRole('button', { name: 'Listo' }).click()
  await expect(hoja.getByRole('alert')).toHaveText('Elegí la fecha.')
  await hoja.getByLabel('Fecha').fill('2026-12-05')
  await hoja.getByLabel('Hora (opcional)').fill('09:00')
  await captura(page, '2-contame-no-entendi-corregir')
  await hoja.getByRole('button', { name: 'Listo' }).click()
  await expect(hoja).toHaveCount(0)
  // pasó a "Lo que voy a guardar"
  await expect(filas).toHaveCount(3)
  await expect(filas.nth(2)).toContainText('Arreglar el garaje (sábado 5/12, 09:00)')
  await expect(dudas).toHaveCount(1)
  await expect(dudas.nth(0)).toContainText('lo de la moto')
  await expect(dudas.nth(0).getByRole('radio', { name: 'Descartar' })).toBeChecked()
  await captura(page, '3-contame-revision-corregida')

  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
  await expect(page.getByText('Tareas pendientes: Ir a Canelones a buscar los papeles (lunes 30/11)')).toBeVisible()
  await expect(page.getByText('Calendario: Reunión en Canelones (lunes 30/11, 10:30)')).toBeVisible()
  await expect(page.getByText('Calendario: Arreglar el garaje (sábado 5/12, 09:00)')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(ISO)

  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeEnabled()

  // la tarea: texto limpio y la fecha aparte (en otra pestaña: Contame se refresca sola después de guardar)
  page = await page.context().newPage()
  await page.goto('/pendientes')
  const tarea = page.locator('[data-fila]').filter({ hasText: 'Ir a Canelones a buscar los papeles' })
  await expect(tarea).toContainText('lunes 30/11')
  await expect(page.locator('main')).not.toContainText(ISO)
  await expect(page.locator('main')).not.toContainText('El lunes')
  await captura(page, '4-pendientes-con-fecha')

  // los eventos: en el Calendario, una vez
  await page.goto('/calendario')
  await expect(page.getByText('Reunión en Canelones')).toBeVisible()
  await expect(page.getByText('Arreglar el garaje')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(ISO)
  await captura(page, '5-calendario-eventos')
})

test('Tareas pendientes: la fecha se agrega, se edita y se borra aparte del texto', async ({ page }) => {
  await page.goto('/pendientes')
  const mas = page.getByRole('button', { name: 'Agregar tarea' })
  await hidratado(mas)
  await mas.click()
  const nueva = page.getByRole('dialog', { name: 'Nueva tarea' })
  await nueva.getByLabel('Qué hay que hacer').fill('Llamar al contador')
  await nueva.getByLabel('Para cuándo (opcional)').fill('2026-12-02')
  await nueva.getByRole('button', { name: 'Guardar' }).click()
  await expect(nueva).toHaveCount(0)
  const fila = page.locator('[data-fila]').filter({ hasText: 'Llamar al contador' })
  await expect(fila).toContainText('miércoles 2/12')

  // editar: la fecha cargada; se cambia y después se borra
  await page.getByRole('button', { name: 'Editar Llamar al contador', exact: true }).click()
  const hoja = page.getByRole('dialog', { name: 'Editar tarea' })
  await expect(hoja.getByLabel('Para cuándo (opcional)')).toHaveValue('2026-12-02')
  await hoja.getByLabel('Para cuándo (opcional)').fill('2026-12-04')
  await captura(page, '6-editar-tarea-fecha')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
  await expect(fila).toContainText('viernes 4/12')

  await page.getByRole('button', { name: 'Editar Llamar al contador', exact: true }).click()
  await expect(hoja.getByLabel('Para cuándo (opcional)')).toHaveValue('2026-12-04')
  await hoja.getByLabel('Para cuándo (opcional)').fill('')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
  await expect(fila).not.toContainText('4/12')
  await expect(fila).toHaveText(/^\s*Llamar al contador\s*$/)
})
