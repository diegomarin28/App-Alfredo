/** Devuelve `598` + 8 dígitos (móvil 9XXXXXXX, fijo 2/4XXXXXXX), o null. */
export function normalizarTelUY(input: string): string | null {
  const limpio = input.replace(/[\s\-.()]/g, '')
  if (!/^\+?\d+$/.test(limpio)) return null
  const digitos = limpio.replace('+', '')
  let local: string
  if (digitos.startsWith('598')) local = digitos.slice(3)
  else if (/^09\d{7}$/.test(digitos)) local = digitos.slice(1)
  else if (/^[24]\d{7}$/.test(digitos)) local = digitos
  else return null
  return /^[924]\d{7}$/.test(local) ? `598${local}` : null
}

export function waLink(texto: string, telefono?: string): string {
  const tel = telefono ? normalizarTelUY(telefono) : null
  return `https://wa.me/${tel ?? ''}?text=${encodeURIComponent(texto)}`
}

export function telLink(telefono: string): string {
  const n = normalizarTelUY(telefono)
  return `tel:+${n ?? telefono.replace(/\D/g, '')}`
}

/** Para la hoja de edición: "59899123456" → "099 123 456", "59829001234" → "2900 1234". */
export function telParaEditar(telefono: string | null | undefined): string {
  if (!telefono) return ''
  const m = /^598(\d{8})$/.exec(telefono)
  if (!m) return telefono
  const l = m[1]
  return l.startsWith('9') ? `0${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5)}` : `${l.slice(0, 4)} ${l.slice(4)}`
}
