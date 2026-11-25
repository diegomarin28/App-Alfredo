/**
 * Opciones de "Posponer" (en días), siempre de menor a mayor; después va "Elegir fecha". La por defecto de cada
 * recordatorio se muestra marcada en su lugar del orden, no primera (ronda 5).
 */
export const OPCIONES_POSPONER: readonly (readonly [number, string])[] = [
  [1, '1 día'], [3, '3 días'], [7, '1 semana'], [15, '15 días'], [30, '1 mes'],
]
