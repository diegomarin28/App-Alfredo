/** URL que Alfredo le manda a la familia. Sin código configurado no hay link. */
export function linkFamilia(origen: string, codigo: string | undefined): string | null {
  if (!codigo) return null
  return `${origen.replace(/\/$/, '')}/familia?codigo=${encodeURIComponent(codigo)}`
}

/** "25 de noviembre de 2026" en hora de Montevideo, o null si falta o es inválida. */
export function vigenciaLarga(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('es', { timeZone: 'America/Montevideo', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}
