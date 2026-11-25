import { expect, test } from '@playwright/test'
import path from 'node:path'
import {
  conFaceIdVirtual, decir, guion, hidratado, instalarVozFalsa, resetear, sinErroresNiDesborde, vigilarErrores,
} from './helpers'
import { ENTORNO_E2E } from './entorno'
import { waLink } from '../../src/domain/telefono'

const FOTO = path.join(__dirname, 'fixtures', 'foto.jpg')
const PIN = '482915'
const SECRETO = 'Plata-Secreta-2026!'

test('recorrido completo de Alfredo, de la entrada a Inicio', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  test.setTimeout(240_000)
  const errores = vigilarErrores(page)
  const revisar = (donde: string) => sinErroresNiDesborde(page, errores, donde)

  await page.addInitScript(instalarVozFalsa)
  await resetear(page, {
    hoy: '2026-10-26',
    datos: {
      fechas: [{ nombre: 'Ana Pérez', tipo: 'cumple', dia: '10-26', anioNacimiento: 1990 }],
      contactos: [{ nombre: 'Martín Pérez', empresa: 'Ferretería Sur', telefono: '59899123456' }],
    },
    config: { nombre: 'Alfredo' },
  })

  // Entrar: se registra Face ID una vez, se sale y se vuelve a entrar con Face ID.
  await conFaceIdVirtual(page)
  await page.goto('/configurar')
  await page.getByLabel('Código de configuración').fill(ENTORNO_E2E.SETUP_CODE)
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/$/)
  expect((await page.request.post('/api/auth/salir')).status()).toBe(200)
  await page.goto('/entrar')
  await revisar('/entrar')
  await page.getByRole('button', { name: 'Entrar con Face ID' }).click()

  // Inicio
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await expect(page.getByText('Cumple de Ana Pérez')).toBeVisible()
  await revisar('Inicio')

  // Calendario: hoy cumple Ana, el saludo por WhatsApp
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Calendario' }).click()
  await expect(page).toHaveURL(/\/calendario$/)
  await revisar('Calendario')
  await hidratado(page.getByRole('button', { name: 'Mandar saludo' }))
  await page.getByRole('button', { name: 'Mandar saludo' }).click()
  const saludo = await page.getByRole('textbox', { name: 'Saludo' }).inputValue()
  expect(saludo).toContain('Ana')
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink(saludo))
  await revisar('Saludo')
  await page.getByRole('button', { name: 'Cerrar' }).click()

  // Recordatorios: resolver Navidad
  await page.getByRole('main').getByRole('link', { name: /^Recordatorios/ }).click()
  await expect(page).toHaveURL(/\/recordatorios$/)
  const activos = page.getByRole('region', { name: 'Para gestionar ahora' })
  const navidad = activos.getByRole('article', { name: 'Gestionar Navidad' })
  await expect(navidad).toBeVisible()
  await hidratado(page.getByRole('region', { name: 'Para gestionar ahora' }).getByRole('button', { name: 'Resuelto' }).first())
  await navidad.getByRole('button', { name: 'Resuelto' }).click()
  await expect(page.getByText('¡Listo!')).toBeVisible()
  await expect(navidad).toHaveCount(0)
  await revisar('Recordatorios')

  // Contame: dictado que se archiva en Portofino
  await guion(page, [{
    texto: '',
    toolName: 'guardar',
    toolInput: { acciones: [{ tipo: 'eventoCasa', casa: 'portofino', que: 'Cambié la bomba de agua', cuando: '2026-10-25' }] },
  }])
  await page.getByRole('link', { name: 'Hablar con el asistente' }).click()
  await page.getByRole('button', { name: 'Tocá para hablar' }).click()
  await decir(page, 'Ayer cambié la bomba de agua en Portofino')
  await page.getByRole('button', { name: 'Tocá para terminar' }).click()
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('heading', { name: 'Esto es lo que entendí' })).toBeVisible()
  await revisar('Contame revisión')
  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
  await expect(page.getByText('Historial de Portofino: Cambié la bomba de agua (25 de octubre)')).toBeVisible()
  await revisar('Contame')
  await page.goto('/casas?casa=portofino')
  await expect(page.getByText('Cambié la bomba de agua')).toBeVisible()
  await revisar('Portofino')

  // Mensajes: sugerir respuesta
  await guion(page, [{ texto: 'Dale Martín, el viernes cerramos.' }])
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mensajes' }).click()
  await hidratado(page.getByRole('button', { name: 'Sugerir respuesta' }))
  await page.getByRole('radio', { name: 'Me escribieron' }).click()
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes?')
  await page.getByRole('button', { name: 'Sugerir respuesta' }).click()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue('Dale Martín, el viernes cerramos.')
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink('Dale Martín, el viernes cerramos.'))
  await revisar('Mensajes')

  // Documentos: subir una foto a Seguros
  await page.goto('/')
  await page.getByRole('link', { name: 'Documentos' }).click()
  await page.getByRole('link', { name: /^Seguros/ }).click()
  await hidratado(page.getByRole('button', { name: 'Agregar documento' }))
  await page.getByRole('button', { name: 'Agregar documento' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo documento' })
  await hoja.locator('input[type=file]').first().setInputFiles(FOTO)
  await hoja.getByLabel('Título').fill('Póliza auto')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Póliza auto')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Póliza auto' })).toBeVisible()
  await revisar('Documentos')

  // Contraseñas: PIN nuevo y agregar una
  await page.goto('/')
  await page.getByRole('link', { name: 'Contraseñas' }).click()
  await page.getByRole('button', { name: 'Desbloquear con Face ID' }).click()
  await page.getByLabel('Elegí un PIN de 6 números').fill(PIN)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByLabel('Repetilo').fill(PIN)
  await page.getByRole('button', { name: 'Guardar PIN' }).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
  await page.getByLabel('Sitio').fill('Banco')
  await page.getByLabel('Usuario').fill('alfredo')
  await page.getByLabel('Contraseña', { exact: true }).fill(SECRETO)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  const banco = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await expect(banco).toBeVisible()
  await expect(page.getByText(SECRETO)).toHaveCount(0)
  await revisar('Contraseñas')

  // Contactos: link para llamar
  await page.goto('/')
  await page.getByRole('link', { name: 'Contactos' }).click()
  const martin = page.getByRole('listitem').filter({ hasText: 'Martín Pérez' })
  await expect(martin.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+59899123456')
  await revisar('Contactos')

  // Ajustes y de vuelta a Inicio
  await page.goto('/')
  await page.getByRole('link', { name: 'Ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await revisar('Ajustes')
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await revisar('Inicio (final)')
})
