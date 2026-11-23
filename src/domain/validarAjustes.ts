export type ResultadoTexto = { ok: true; valor: string } | { ok: false; error: string }

export const MAX_NOMBRE = 40
export const MAX_ESTILO = 4000

export function validarNombre(x: unknown): ResultadoTexto {
  if (typeof x !== 'string') return { ok: false, error: 'Escribí cómo querés que te saluden.' }
  const valor = x.trim()
  if (!valor) return { ok: false, error: 'Escribí cómo querés que te saluden.' }
  if (valor.length > MAX_NOMBRE) return { ok: false, error: `El nombre es muy largo (máximo ${MAX_NOMBRE} letras).` }
  return { ok: true, valor }
}

export function validarEstilo(x: unknown): ResultadoTexto {
  if (typeof x !== 'string') return { ok: false, error: 'No entendí el texto.' }
  const valor = x.trim()
  if (valor.length > MAX_ESTILO) return { ok: false, error: `Es muy largo (máximo ${MAX_ESTILO} letras).` }
  return { ok: true, valor }
}
