import { devices, expect, test, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import { entrarComo, guion, hidratado, resetear } from './helpers'

// Ronda 6: editar todo, Contame revisa antes de guardar y detalles.
// Con SALIDA=<carpeta> corre como iPhone 15 en WebKit y deja capturas de cada hoja de edición y de la revisión.
const SALIDA = process.env.SALIDA
if (SALIDA) test.use({ ...devices['iPhone 15'], browserName: 'webkit', viewport: { width: 393, height: 852 } })

const HOY = '2026-11-24' // martes

async function captura(page: Page, nombre: string) {
  if (!SALIDA) return
  await page.waitForTimeout(600) // que terminen las animaciones de la hoja
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), animations: 'disabled' })
}

const fila = (page: Page, texto: string) => page.locator('[data-fila]').filter({ hasText: texto })

/** Toca la fila (su parte editable) y devuelve la hoja que se abrió. */
async function editar(page: Page, nombre: string, titulo: string): Promise<Locator> {
  const b = page.getByRole('button', { name: `Editar ${nombre}`, exact: true })
  await hidratado(b)
  await b.click()
  const hoja = page.getByRole('dialog', { name: titulo })
  await expect(hoja).toBeVisible()
  return hoja
}

async function guardarHoja(hoja: Locator) {
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
}

test.describe('todo se edita tocándolo', () => {
  test('Calendario: cumpleaños y "Otra" semanal, con los datos cargados', async ({ page }) => {
    await resetear(page, {
      hoy: HOY,
      datos: {
        fechas: [
          { nombre: 'Ana Pérez', tipo: 'cumple', dia: '12-03', anioNacimiento: 1990 },
          { nombre: 'Pádel', tipo: 'otra', dia: '11-24', repeticion: 'semanal', anioEvento: 2026, diasSemana: [2, 4], hora: '19:00' },
        ],
      },
    })
    await entrarComo(page, 'owner')
    await page.goto('/calendario')

    let hoja = await editar(page, 'Ana Pérez', 'Editar fecha')
    await expect(hoja.getByLabel('Nombre')).toHaveValue('Ana Pérez')
    await expect(hoja.getByLabel('Día', { exact: true })).toHaveValue('3')
    await expect(hoja.getByLabel('Mes', { exact: true })).toHaveValue('12')
    await expect(hoja.getByLabel('Año de nacimiento (opcional)')).toHaveValue('1990')
    await captura(page, '1-calendario-cumple')
    await hoja.getByLabel('Nombre').fill('Ana María Pérez')
    await hoja.getByLabel('Día', { exact: true }).selectOption('5')
    await guardarHoja(hoja)
    await expect(fila(page, 'Ana María Pérez')).toContainText('5')
    await expect(fila(page, 'Ana María Pérez')).toContainText('cumple 36 años')

    hoja = await editar(page, 'Pádel', 'Editar fecha')
    await expect(hoja.getByRole('radio', { name: 'Otra' })).toBeChecked()
    await expect(hoja.getByLabel('Se repite')).toHaveValue('semanal')
    await expect(hoja.getByRole('checkbox', { name: 'martes' })).toBeChecked()
    await expect(hoja.getByRole('checkbox', { name: 'jueves' })).toBeChecked()
    await expect(hoja.getByLabel('Hora (opcional)')).toHaveValue('19:00')
    await captura(page, '1-calendario-otra')
    await hoja.getByRole('checkbox', { name: 'sábado' }).click()
    await hoja.getByLabel('Hora (opcional)').fill('20:30')
    await guardarHoja(hoja)
    await expect(fila(page, 'Pádel').first()).toContainText('mar, jue y sáb · 20:30 h')
    // el borrar sigue como está: no abre la edición
    await fila(page, 'Ana María Pérez').getByRole('button', { name: 'Borrar Ana María Pérez' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Se borró' })).toBeVisible()
  })

  test('Casas: quién se ocupa, servicios e historial; "Agregar teléfono" y "Falta el número"', async ({ page }) => {
    await resetear(page, {
      hoy: HOY,
      datos: {
        personasCasa: [{ id: 'p-marta', casa: 'malibu', nombre: 'Marta', rol: 'Limpieza', detalle: 'los jueves' }],
        serviciosCasa: [
          { casa: 'malibu', clave: 'Prosegur', valor: null },
          { casa: 'malibu', clave: 'UTE', valor: 'Cuenta 1234' },
          { casa: 'malibu', clave: 'Internet', valor: 'Antel 555' },
          { casa: 'malibu', clave: 'DirecTV', valor: 'Cliente 9' },
          { casa: 'malibu', clave: 'OSE', valor: 'Cuenta 77' },
          { casa: 'malibu', clave: 'Riego', valor: 'Juan 099 000 111' },
        ],
        eventosCasa: [{ casa: 'malibu', que: 'Arreglaron la canilla', cuando: '2026-11-20', creadoEn: '2026-11-20T10:00:00Z' }],
      },
    })
    await entrarComo(page, 'owner')
    await page.goto('/casas?casa=malibu')
    await expect(fila(page, 'Marta')).toContainText('Agregar teléfono')
    await expect(fila(page, 'Prosegur')).toContainText('Falta el número')
    await captura(page, '2-casas-lista')

    let hoja = await editar(page, 'Marta', 'Editar persona')
    await expect(hoja.getByLabel('Nombre')).toHaveValue('Marta')
    await expect(hoja.getByLabel('Qué hace')).toHaveValue('Limpieza')
    await expect(hoja.getByLabel('Qué días va')).toHaveValue('los jueves')
    await expect(hoja.getByLabel('Teléfono')).toBeFocused()
    await captura(page, '2-casas-persona')
    await hoja.getByLabel('Teléfono').fill('099 123 456')
    await hoja.getByLabel('Qué días va').fill('martes y jueves')
    await guardarHoja(hoja)
    await expect(fila(page, 'Marta')).toContainText('Limpieza · martes y jueves')
    await expect(fila(page, 'Marta').getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+59899123456')
    await expect(fila(page, 'Marta')).not.toContainText('Agregar teléfono')
    // con teléfono, la hoja lo muestra como se escribe
    hoja = await editar(page, 'Marta', 'Editar persona')
    await expect(hoja.getByLabel('Teléfono')).toHaveValue('099 123 456')
    await hoja.getByRole('button', { name: 'Cerrar' }).click()

    hoja = await editar(page, 'Prosegur', 'Editar servicio')
    await expect(hoja.getByLabel('Dato')).toBeFocused()
    await captura(page, '2-casas-servicio')
    await hoja.getByLabel('Dato').fill('Abonado 4455')
    await guardarHoja(hoja)
    await expect(fila(page, 'Prosegur')).toContainText('Abonado 4455')

    hoja = await editar(page, 'Arreglaron la canilla', 'Editar historial')
    await expect(hoja.getByLabel('¿Qué pasó?')).toHaveValue('Arreglaron la canilla')
    await expect(hoja.getByLabel('Fecha')).toHaveValue('2026-11-20')
    await captura(page, '2-casas-historial')
    await hoja.getByLabel('¿Qué pasó?').fill('Arreglaron la canilla del baño')
    await hoja.getByLabel('Fecha').fill('2026-11-21')
    await guardarHoja(hoja)
    await expect(fila(page, 'canilla del baño')).toContainText('21 de noviembre de 2026')

    await page.reload()
    await expect(page.getByText('martes y jueves')).toBeVisible()
    await expect(page.getByText('Abonado 4455')).toBeVisible()
  })

  test('Contactos: editar y "Agregar teléfono"', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { contactos: [{ nombre: 'Anabel', empresa: 'Inmobiliaria' }, { nombre: 'Dr. Silva', telefono: '59829001234' }] } })
    await entrarComo(page, 'owner')
    await page.goto('/contactos')
    await expect(fila(page, 'Anabel')).toContainText('Agregar teléfono')
    await expect(fila(page, 'Dr. Silva')).not.toContainText('Agregar teléfono')
    const hoja = await editar(page, 'Anabel', 'Editar contacto')
    await expect(hoja.getByLabel('Empresa')).toHaveValue('Inmobiliaria')
    await expect(hoja.getByLabel('Teléfono')).toBeFocused()
    await captura(page, '3-contacto')
    await hoja.getByLabel('Teléfono').fill('099 111 222')
    await hoja.getByLabel('Nota').fill('La de la casa de Malibú')
    await guardarHoja(hoja)
    await expect(fila(page, 'Anabel')).toContainText('La de la casa de Malibú')
    await expect(fila(page, 'Anabel').getByRole('link', { name: 'Llamar a Anabel' })).toBeVisible()
  })

  test('Vencimientos: tocar la fila edita título, fecha y aviso; el círculo sigue tildando', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { vencimientos: [{ titulo: 'Patente', ambito: 'personal', fecha: '2026-12-10', avisarDiasAntes: 7, hecho: false }] } })
    await entrarComo(page, 'owner')
    await page.goto('/vencimientos')
    const hoja = await editar(page, 'Patente', 'Editar vencimiento')
    await expect(hoja.getByLabel('Título')).toHaveValue('Patente')
    await expect(hoja.getByLabel('Fecha')).toHaveValue('2026-12-10')
    await expect(hoja.getByRole('radio', { name: 'Personal' })).toBeChecked()
    await expect(hoja.getByRole('button', { name: '1 semana' })).toHaveAttribute('aria-pressed', 'true')
    await captura(page, '4-vencimiento')
    await hoja.getByLabel('Título').fill('Patente del auto')
    await hoja.getByLabel('Fecha').fill('2026-12-15')
    await hoja.getByRole('radio', { name: 'Empresa' }).click()
    await guardarHoja(hoja)
    await expect(page.getByRole('region', { name: 'Empresa' })).toContainText('Patente del auto')
    await expect(fila(page, 'Patente del auto')).toContainText('15 dic 2026')
    await page.getByRole('checkbox', { name: 'Marcar Patente del auto como hecho' }).click()
    await expect(page.getByText('Marcado como hecho')).toBeVisible()
  })

  test('Recordatorios: tocar la fila abre la edición', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { recordatorios: [{ titulo: 'Renovar seguro', dia: '03-01', avisarDiasAntes: 30 }] } })
    await entrarComo(page, 'owner')
    await page.goto('/recordatorios')
    const hoja = await editar(page, 'Renovar seguro', 'Editar recordatorio')
    await expect(hoja.getByLabel('Título')).toHaveValue('Renovar seguro')
    await captura(page, '5-recordatorio')
    await hoja.getByLabel('Título').fill('Renovar seguro del auto')
    await guardarHoja(hoja)
    await expect(fila(page, 'Renovar seguro del auto')).toContainText('1 mar')
  })

  test('Tareas pendientes y Notas: tocar el texto lo edita; el círculo sigue tildando', async ({ page }) => {
    await resetear(page, {
      hoy: HOY,
      datos: {
        pendientes: [{ texto: 'Llamar al contador', hecho: false, creadoEn: '2026-11-20T10:00:00Z' }, { texto: 'Otra', hecho: false, creadoEn: '2026-11-20T10:00:00Z' }],
        notas: [{ texto: 'Idea para el jardín', origen: 'escrita', creadoEn: '2026-11-20T10:00:00Z' }],
      },
    })
    await entrarComo(page, 'owner')
    await page.goto('/pendientes')
    let hoja = await editar(page, 'Llamar al contador', 'Editar tarea')
    await expect(hoja.getByLabel('Qué hay que hacer')).toHaveValue('Llamar al contador')
    await captura(page, '6-tarea')
    await hoja.getByLabel('Qué hay que hacer').fill('Llamar al contador el lunes')
    await guardarHoja(hoja)
    await expect(page.getByText('Llamar al contador el lunes')).toBeVisible()

    hoja = await editar(page, 'nota: Idea para el jardín', 'Editar nota')
    await expect(hoja.getByLabel('Nota')).toHaveValue('Idea para el jardín')
    await captura(page, '6-nota')
    await hoja.getByLabel('Nota').fill('Idea para el jardín: plantar jazmines')
    await guardarHoja(hoja)
    await expect(page.getByText('plantar jazmines')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Otra' }).click()
    await expect(page.getByRole('region', { name: 'Por hacer' })).not.toContainText('Otra')
  })
})

test.describe('Contame revisa antes de guardar', () => {
  test.beforeEach(async ({ page }) => {
    await resetear(page, {
      hoy: HOY,
      datos: { personasCasa: [{ casa: 'portofino', nombre: 'Simón', rol: 'Jardinero' }], fechas: [{ nombre: 'Pau Gericke', tipo: 'cumple', dia: '03-01' }] },
    })
    await entrarComo(page, 'owner')
  })

  async function dictarEscrito(page: Page, texto: string) {
    await page.goto('/contame')
    const escribir = page.getByRole('button', { name: 'Prefiero escribir' })
    await hidratado(escribir)
    await escribir.click()
    await page.getByLabel('Escribí o dictá con el teclado').fill(texto)
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByRole('heading', { name: 'Esto es lo que entendí' })).toBeVisible()
  }

  test('"Esto es lo que entendí": corregir, sacar, "No entendí" y "Guardar todo"', async ({ page }) => {
    await guion(page, [{
      texto: '', toolName: 'guardar',
      toolInput: {
        acciones: [
          { tipo: 'eventoCasa', casa: 'portofino', que: 'Le pagué a Simón', cuando: '2026-11-24' },
          { tipo: 'pendiente', texto: 'Pagar la patente' },
          { tipo: 'fecha', nombre: 'Juan (hijo)', tipoFecha: 'cumple', dia: '04-10' },
          { tipo: 'nota', texto: 'Hay una vez' },
          { tipo: 'pendiente', texto: 'Llamar a Pau Henrique' },
        ],
        noEntendi: ['eh', 'lo de la moto', 'el coso del garaje'],
      },
    }])
    await dictarEscrito(page, 'Le pagué a Simón. Hay una vez, perdón. Pagar la patente el 10 de diciembre. El cumple de mi hijo Juan es el 10 de abril. Llamar a Pau Enrique. Lo de la moto. El coso del garaje.')
    // lo que manda a la IA ya va con el apellido corregido
    const llamadas = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
    expect(llamadas[0].mensajes[0].texto).toContain('Llamar a Pau Gericke.')
    expect(llamadas[0].mensajes[0].texto).toContain('- Pau Gericke')

    const filas = page.getByRole('list', { name: 'Lo que voy a guardar' }).locator('[data-fila]')
    await expect(filas).toHaveCount(4) // "Hay una vez" no quedó como nota
    await expect(filas.nth(0)).toContainText('Le pagué a Simón (24 de noviembre)')
    await expect(filas.nth(0)).toContainText('Historial de Portofino')
    await expect(filas.nth(2)).toContainText('Cumpleaños de Juan (10 de abril)')
    await expect(filas.nth(3)).toContainText('Llamar a Pau Gericke')
    const dudas = page.getByRole('list', { name: 'Lo que no entendí' }).locator('[data-duda]')
    await expect(dudas).toHaveCount(2)
    await expect(dudas.nth(0)).toContainText('No entendí: «lo de la moto»')
    // por defecto se descarta
    await expect(dudas.nth(0).getByRole('radio', { name: 'Descartar' })).toBeChecked()
    await captura(page, '7-contame-revision')

    // tocar una fila: corregir texto, fecha y a qué sección va
    await page.getByRole('button', { name: 'Corregir: Pagar la patente' }).click()
    const hoja = page.getByRole('dialog', { name: 'Corregir' })
    await expect(hoja.getByLabel('Va en')).toHaveValue('pendiente')
    await hoja.getByLabel('Va en').selectOption('vencPersonal')
    await hoja.getByLabel('Qué vence').fill('Patente del auto')
    await hoja.getByRole('button', { name: 'Listo' }).click()
    await expect(hoja.getByRole('alert')).toHaveText('Elegí la fecha.')
    await hoja.getByLabel('Fecha').fill('2026-12-10')
    await expect(hoja.getByRole('alert')).toHaveCount(0)
    await captura(page, '7-contame-corregir')
    await hoja.getByRole('button', { name: 'Listo' }).click()
    await expect(hoja).toHaveCount(0)
    await expect(filas.nth(1)).toContainText('Patente del auto (10 de diciembre de 2026)')
    await expect(filas.nth(1)).toContainText('Vencimientos')

    // la ✕ saca una fila
    await page.getByRole('button', { name: 'Sacar: Llamar a Pau Gericke' }).click()
    await expect(filas).toHaveCount(3)
    // "No entendí": una como nota, la otra se descarta
    await dudas.nth(1).getByRole('radio', { name: 'Guardar como nota' }).click()

    // nada se guardó todavía
    const casas = await page.context().newPage()
    await casas.goto('/casas?casa=portofino')
    await expect(casas.getByRole('heading', { name: 'Historial' })).toBeVisible()
    await expect(casas.getByText('Le pagué a Simón')).toHaveCount(0)

    await page.getByRole('button', { name: 'Guardar todo' }).click()
    await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
    await expect(page.getByText('Historial de Portofino: Le pagué a Simón (24 de noviembre)')).toBeVisible()
    await expect(page.getByText('Vencimientos: Patente del auto (10 de diciembre de 2026)')).toBeVisible()
    await expect(page.getByText('Calendario: cumpleaños de Juan (10 de abril)')).toBeVisible()
    await expect(page.getByText('Notas: el coso del garaje')).toBeVisible()
    await expect(page.getByText('lo de la moto')).toHaveCount(0)
    await expect(page.getByText('Llamar a Pau Gericke')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible()

    await casas.reload()
    await expect(casas.getByText('Le pagué a Simón')).toBeVisible()
    await casas.goto('/pendientes')
    await expect(casas.getByText('el coso del garaje')).toBeVisible()
    await expect(casas.getByText('Hay una vez')).toHaveCount(0)
    await expect(casas.getByText('lo de la moto')).toHaveCount(0)

    // "Deshacer" como antes
    await page.getByRole('button', { name: 'Deshacer' }).click()
    await expect(page.getByText('Listo, lo deshice.')).toBeVisible()
    await casas.goto('/casas?casa=portofino')
    await expect(casas.getByRole('heading', { name: 'Historial' })).toBeVisible()
    await expect(casas.getByText('Le pagué a Simón')).toHaveCount(0)
  })

  test('"Cancelar" no guarda nada', async ({ page }) => {
    await guion(page, [{ texto: '', toolName: 'guardar', toolInput: { acciones: [{ tipo: 'pendiente', texto: 'Comprar pilas' }] } }])
    await dictarEscrito(page, 'Comprar pilas')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { name: 'Esto es lo que entendí' })).toHaveCount(0)
    await page.goto('/pendientes')
    await expect(page.getByRole('heading', { level: 1, name: 'Tareas pendientes' })).toBeVisible()
    await expect(page.getByText('Comprar pilas')).toHaveCount(0)
  })

  test('solo muletillas: "No encontré nada para guardar"', async ({ page }) => {
    await guion(page, [{ texto: '', toolName: 'guardar', toolInput: { acciones: [{ tipo: 'nota', texto: 'eh' }], noEntendi: ['perdón'] } }])
    await dictarEscrito(page, 'eh, perdón')
    await expect(page.getByText('No encontré nada para guardar.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar todo' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Contar otra cosa' }).click()
    await expect(page.getByRole('button', { name: 'Prefiero escribir' })).toBeVisible()
  })
})

test('Inicio y Calendario: singular y "Lo próximo" sin filas vacías', async ({ page }) => {
  await resetear(page, {
    hoy: HOY,
    datos: {
      fechas: [{ nombre: 'Benja', tipo: 'cumple', dia: '11-25', anioNacimiento: 2025 }],
      pendientes: [{ texto: 'Una sola', hecho: false, creadoEn: '2026-11-20T10:00:00Z' }],
    },
  })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const prox = page.getByRole('region', { name: 'Lo próximo' })
  await expect(prox.getByRole('listitem')).toHaveCount(2)
  await expect(prox).toContainText('Mañana · cumple 1 año')
  await expect(prox).toContainText('1 tarea pendiente')
  await prox.scrollIntoViewIfNeeded()
  await captura(page, '8-inicio-lo-proximo')
  await page.goto('/calendario')
  await expect(fila(page, 'Benja')).toContainText('Cumpleaños · cumple 1 año')
  await captura(page, '8-calendario-1-ano')
})
