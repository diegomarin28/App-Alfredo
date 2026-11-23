import 'server-only'
import { AnthropicClient, FakeAiClient, type AiClient } from './client'
import { FakeEmailSender, ResendEmailSender, type EmailSender } from './email'

declare global {
  var __alfredoAi: FakeAiClient | undefined
  var __alfredoEmail: FakeEmailSender | undefined
}

const fake = () => process.env.AI_BACKEND === 'fake'

/** Solo servidor. Fake si AI_BACKEND=fake o falta ANTHROPIC_API_KEY. */
export function getAi(): AiClient {
  const key = process.env.ANTHROPIC_API_KEY
  if (fake() || !key) return (globalThis.__alfredoAi ??= new FakeAiClient())
  return new AnthropicClient(key, process.env.ANTHROPIC_MODEL)
}

/** El fake singleton (para la ruta de pruebas); null si se usa la IA real. */
export function getAiFake(): FakeAiClient | null {
  return fake() || !process.env.ANTHROPIC_API_KEY ? (getAi() as FakeAiClient) : null
}

/** Solo servidor. Fake si AI_BACKEND=fake o falta RESEND_API_KEY. */
export function getEmail(): EmailSender {
  const key = process.env.RESEND_API_KEY
  if (fake() || !key) return (globalThis.__alfredoEmail ??= new FakeEmailSender())
  return new ResendEmailSender(key, process.env.ALERT_FROM || undefined)
}
