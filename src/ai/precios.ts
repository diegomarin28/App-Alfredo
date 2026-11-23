import { MODELO_CONTAME, MODELO_MENSAJES, type ModeloIa } from './client'

/** USD por millón de tokens. Caché de 5 minutos: escribir = 1,25 × entrada. */
interface Precio { entrada: number; salida: number; escrituraCache: number; lecturaCache: number }

export interface UsoTokens { tokensIn: number; tokensOut: number; tokensCacheWrite: number; tokensCacheRead: number }

const SONNET_5_5: Precio = { entrada: 2, salida: 10, escrituraCache: 2.5, lecturaCache: 0.1 }
const HAIKU_5_5: Precio = { entrada: 0.1, salida: 0.5, escrituraCache: 0.125, lecturaCache: 0.01 }
/** Haiku 5.5 con un prompt de más de 100.000 tokens: 0,50 / 2,50 y la caché sobre esa entrada. */
const HAIKU_5_5_LARGO: Precio = { entrada: 0.5, salida: 2.5, escrituraCache: 0.625, lecturaCache: 0.05 }
export const UMBRAL_PROMPT_LARGO_HAIKU = 100_000

function precio(modelo: ModeloIa, prompt: number): Precio {
  if (modelo === MODELO_MENSAJES) return SONNET_5_5
  if (modelo === MODELO_CONTAME) return prompt > UMBRAL_PROMPT_LARGO_HAIKU ? HAIKU_5_5_LARGO : HAIKU_5_5
  throw new Error(`Modelo sin precio: ${modelo satisfies never}`)
}

/** Tokens de entrada del pedido: sin caché + escritos en caché + leídos de caché. */
export const tokensPrompt = (u: UsoTokens): number => u.tokensIn + u.tokensCacheWrite + u.tokensCacheRead

/** Costo exacto en USD de una llamada, con el precio de su modelo. */
export function costoUsd(modelo: ModeloIa, u: UsoTokens): number {
  const p = precio(modelo, tokensPrompt(u))
  return (u.tokensIn * p.entrada + u.tokensCacheWrite * p.escrituraCache + u.tokensCacheRead * p.lecturaCache + u.tokensOut * p.salida) / 1e6
}
