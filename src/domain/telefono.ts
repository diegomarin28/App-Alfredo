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
