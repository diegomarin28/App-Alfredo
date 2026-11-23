import 'server-only'
import { AnthropicClient, FakeAiClient, type AiClient } from './client'
import { FakeEmailSender, ResendEmailSender, type EmailSender } from './email'

declare global {
  var __alfredoAi: FakeAiClient | undefined
  var __alfredoEmail: FakeEmailSender | undefined
}

const fake = () => process.env.AI_BACKEND === 'fake'
const produccion = () => process.env.NODE_ENV === 'production'

export class IaNoConfiguradaError extends Error {
  constructor() {
    super('La IA no está configurada, avisale a Diego.')
    this.name = 'IaNoConfiguradaError'
  }
}

/** Cliente de producción sin clave: falla antes de gastar nada (usarIa no registra costo). */
class AiNoConfigurada implements AiClient {
  async completar(): Promise<never> {
    throw new IaNoConfiguradaError()
  }
}

/** Solo servidor. Fake si AI_BACKEND=fake (o, fuera de producción, si falta ANTHROPIC_API_KEY). */
export function getAi(): AiClient {
  const key = process.env.ANTHROPIC_API_KEY
  if (fake()) return (globalThis.__alfredoAi ??= new FakeAiClient())
  if (!key && produccion()) return new AiNoConfigurada()
  if (!key) return (globalThis.__alfredoAi ??= new FakeAiClient())
  return new AnthropicClient(key, process.env.ANTHROPIC_MODEL)
}

/** El fake singleton (para la ruta de pruebas); null si se usa la IA real. */
export function getAiFake(): FakeAiClient | null {
  // Sin instanceof: en dev cada ruta puede tener su propia copia de la clase.
  return fake() || (!process.env.ANTHROPIC_API_KEY && !produccion()) ? (getAi() as FakeAiClient) : null
}

/** Solo servidor. Fake si AI_BACKEND=fake o falta RESEND_API_KEY. */
export function getEmail(): EmailSender {
  const key = process.env.RESEND_API_KEY
  if (!fake() && !key && produccion()) {
    return {
      async enviar() {
        console.error('[ia] Falta RESEND_API_KEY: no se puede mandar el aviso de poco saldo.')
        throw new Error('Falta RESEND_API_KEY')
      },
    }
  }
  if (fake() || !key) return (globalThis.__alfredoEmail ??= new FakeEmailSender())
  return new ResendEmailSender(key, process.env.ALERT_FROM || undefined)
}
