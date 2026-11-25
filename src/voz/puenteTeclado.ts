/**
 * iOS abre el teclado solo si el foco se pide dentro del toque. Cuando la caja todavía no existe (hay que cambiar
 * de vista o de pantalla), un campo invisible toma el foco ya, se abre el teclado, y cuando aparece la caja el foco
 * pasa a ella (`soltarPuente`). El campo vive en <body>, fuera de React: sobrevive al cambio de pantalla.
 */

let puente: HTMLInputElement | null = null

export function tomarTeclado(caja?: HTMLElement | null): void {
  if (caja) {
    caja.focus()
    return
  }
  if (typeof document === 'undefined' || puente) return
  const i = document.createElement('input')
  i.type = 'text'
  i.tabIndex = -1
  i.setAttribute('aria-hidden', 'true')
  i.dataset.puenteTeclado = ''
  Object.assign(i.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0', fontSize: '16px', border: '0', padding: '0' })
  document.body.appendChild(i)
  i.focus({ preventScroll: true })
  puente = i
}

/** La caja ya tiene el foco (o no hace falta): el campo invisible se va. */
export function soltarPuente(): void {
  puente?.remove()
  puente = null
}
