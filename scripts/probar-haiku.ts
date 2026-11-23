/**
 * Prueba real de Contame con Haiku 5.5 (gasta centavos de la cuenta de Anthropic; no lo corren los tests).
 * Manda UNA clasificación con el mismo prompt, herramientas y opciones que la app, e imprime lo que volvió.
 *
 *   ANTHROPIC_API_KEY=... pnpm probar-haiku ["texto a clasificar"]
 *
 * (= tsx --conditions=react-server scripts/probar-haiku.ts; la condición hace que `server-only` no falle fuera de Next.)
 */
import { AnthropicClient } from '@/ai/client'
import { pedidoClasificacion } from '@/ai/contame'
import { costoUsd, tokensPrompt } from '@/ai/precios'

const key = process.env.ANTHROPIC_API_KEY
if (!key) {
  console.error('Falta ANTHROPIC_API_KEY.')
  process.exit(1)
}

const texto = process.argv[2] ?? 'Ayer le pagué a Simón el jardín. El 10 de diciembre vence la patente. Llamar al plomero.'
const ctx = {
  hoy: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' }),
  personas: [
    { nombre: 'Simón', rol: 'Jardinero', casa: 'portofino' as const },
    { nombre: 'Raúl', rol: 'Jardinero', casa: 'malibu' as const },
  ],
  contactos: ['Lucía Gómez'],
}

async function main(key: string) {
  const pedido = pedidoClasificacion('Alfredo', texto, [], ctx)
  const r = await new AnthropicClient(key).completar(pedido)

  console.log('modelo:      ', r.modelo)
  console.log('stop_reason: ', r.stopReason)
  console.log('herramienta: ', r.toolName ?? '(ninguna)')
  console.log('input:       ', JSON.stringify(r.toolInput, null, 2))
  if (r.texto) console.log('texto:       ', r.texto)
  console.log('uso:         ', {
    input_tokens: r.tokensIn,
    cache_creation_input_tokens: r.tokensCacheWrite,
    cache_read_input_tokens: r.tokensCacheRead,
    output_tokens: r.tokensOut,
    prompt_total: tokensPrompt(r),
  })
  console.log('costo USD:   ', costoUsd(r.modelo, r).toFixed(6))

  const ok = r.stopReason === 'tool_use' && (r.toolName === 'guardar' || r.toolName === 'preguntar')
  console.log(ok ? 'OK: Haiku respondió con una herramienta.' : 'ATENCIÓN: no respondió con guardar/preguntar.')
  process.exit(ok ? 0 : 2)
}

main(key).catch((e) => {
  console.error(e)
  process.exit(1)
})
