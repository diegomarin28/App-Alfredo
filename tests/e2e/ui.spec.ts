import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { abrir, PANTALLAS, sembrar } from './pantallas'

/**
 * Revisión de UI en cada tamaño: toques de 44×44 o más, texto de 16 px o más (14 px en el menú de abajo), sin scroll horizontal y
 * sin problemas de accesibilidad (axe, contraste incluido). Cada pantalla, en su estado inicial.
 */

interface Revision {
  /** elementos tocables de menos de 44×44 */
  chicos: string[]
  /** links dentro de un texto corrido (excepción de WCAG 2.5.8): se informan, no fallan */
  enTexto: string[]
  /** textos de menos de 16 px */
  letraChica: string[]
  anchoPagina: number
  anchoVentana: number
}

/** Corre en la página. Solo cuenta lo que se ve (con tamaño y sin `visibility: hidden`). */
function revisar(): Revision {
  const describir = (el: Element) => {
    const r = el.getBoundingClientRect()
    const texto = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || '')
      .trim().replace(/\s+/g, ' ').slice(0, 40)
    return `<${el.tagName.toLowerCase()}> "${texto}" ${Math.round(r.width)}×${Math.round(r.height)}`
  }
  // Oculto a la vista: sin cajas, `visibility: hidden` o recortado a 1 px (sr-only).
  const seVe = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return false
    return getComputedStyle(el).visibility !== 'hidden'
  }

  const chicos: string[] = []
  const enTexto: string[] = []
  const tocables = document.querySelectorAll(
    'a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary, label:has(input[type=checkbox], input[type=radio])',
  )
  for (const el of tocables) {
    if (!seVe(el)) continue
    // Un checkbox o radio dentro de su label: el toque es el label entero, que se mide aparte.
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue
    const r = el.getBoundingClientRect()
    if (r.width >= 44 && r.height >= 44) continue
    const padre = el.parentElement
    const corrido = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && padre
      && (padre.textContent ?? '').trim().length > (el.textContent ?? '').trim().length
    ;(corrido ? enTexto : chicos).push(describir(el))
  }

  const letraChica: string[] = []
  const caminante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const vistos = new Set<Element>()
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
    const el = n.parentElement
    if (!el || vistos.has(el) || !n.textContent?.trim()) continue
    if (el.closest('script, style, noscript, template')) continue
    const rango = document.createRange()
    rango.selectNodeContents(n)
    const r = rango.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1 || !seVe(el)) continue
    vistos.add(el)
    const px = parseFloat(getComputedStyle(el).fontSize)
    // Única excepción: las etiquetas del menú de abajo (pedido de Diego: menú compacto), con 14 px como mínimo.
    const minimo = el.closest('nav[aria-label="Principal"]') ? 14 : 16
    if (px < minimo) letraChica.push(`${describir(el)} ${px}px`)
  }
  // Lo que se escribe en los campos también (además, iOS agranda la página si es menor a 16 px).
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')) {
    if (!seVe(el)) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 16) letraChica.push(`${describir(el)} ${px}px`)
  }

  return {
    chicos, enTexto, letraChica,
    anchoPagina: document.documentElement.scrollWidth,
    anchoVentana: window.innerWidth,
  }
}

let carpetaId = ''
test.beforeAll(async ({ browser }) => { carpetaId = await sembrar(browser) })

for (const p of PANTALLAS) {
  test(`UI ${p.nombre}`, async ({ page }, info) => {
    const donde = `${p.nombre} (${p.rol ?? 'sin sesión'}) en ${info.project.name}`
    await abrir(page, p, carpetaId)
    const r = await page.evaluate(revisar)

    expect.soft(r.chicos, `toques de menos de 44×44 en ${donde}`).toEqual([])
    expect.soft(r.letraChica, `texto de menos de 16 px en ${donde}`).toEqual([])
    // En los teléfonos emulados window.innerWidth crece si algo se pasa de ancho: se compara también con la pantalla.
    const ancho = Math.min(r.anchoVentana, page.viewportSize()!.width)
    expect.soft(r.anchoPagina, `scroll horizontal en ${donde}`).toBeLessThanOrEqual(ancho)

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const problemas = axe.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} — ${n.failureSummary?.split('\n').slice(1).join(' ').trim()}`))
    expect.soft(problemas, `axe (wcag2a, wcag2aa, wcag21aa) en ${donde}`).toEqual([])

    if (r.enTexto.length) info.annotations.push({ type: 'link en texto corrido', description: r.enTexto.join('; ') })
  })
}
