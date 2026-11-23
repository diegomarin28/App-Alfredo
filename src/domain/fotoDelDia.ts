export function fotoDelDia<T>(fotos: T[], hoyStr: string): T | null {
  if (fotos.length === 0) return null
  const [y, m, d] = hoyStr.split('-').map(Number)
  const dias = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  return fotos[dias % fotos.length]
}
