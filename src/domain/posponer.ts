/** Opciones de "Posponer" (en días); la por defecto de cada recordatorio va primera. */
export const OPCIONES_POSPONER: readonly (readonly [number, string])[] = [
  [1, '1 día'], [3, '3 días'], [7, '1 semana'], [15, '15 días'], [30, '1 mes'],
]

/** Las opciones con la por defecto primero. */
export function opcionesPosponer(porDefecto: number): (readonly [number, string])[] {
  const pd = OPCIONES_POSPONER.find(([d]) => d === porDefecto)
  return pd ? [pd, ...OPCIONES_POSPONER.filter(([d]) => d !== porDefecto)] : [...OPCIONES_POSPONER]
}
