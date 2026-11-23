import 'server-only'
import webpush from 'web-push'
import type { Aviso } from './calcular'

export interface SuscripcionPush {
  endpoint: string
  p256dh: string
  auth: string
}

/** Falla con un error que lleva `statusCode` (404/410 = suscripción muerta). */
export interface PushSender {
  enviar(sub: SuscripcionPush, payload: Aviso): Promise<void>
}

declare global {
  var __alfredoPush: FakePushSender | undefined
}

export class WebPushSender implements PushSender {
  constructor(private publica: string, private privada: string, private subject: string) {}

  async enviar(sub: SuscripcionPush, payload: Aviso): Promise<void> {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject: this.subject, publicKey: this.publica, privateKey: this.privada }, TTL: 60 * 60 * 12 },
    )
  }
}

export class FakePushSender implements PushSender {
  enviados: { sub: SuscripcionPush; payload: Aviso }[] = []
  private fallas = new Map<string, number>()

  /** Hace que los envíos a `endpoint` fallen con ese status. */
  fallar(endpoint: string, statusCode: number): void {
    this.fallas.set(endpoint, statusCode)
  }

  async enviar(sub: SuscripcionPush, payload: Aviso): Promise<void> {
    const statusCode = this.fallas.get(sub.endpoint)
    if (statusCode) throw Object.assign(new Error(`Push falló (${statusCode})`), { statusCode })
    this.enviados.push({ sub, payload })
  }
}

export class PushNoConfiguradoError extends Error {
  constructor() {
    super('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT')
    this.name = 'PushNoConfiguradoError'
  }
}

/** Solo servidor. Fake si AI_BACKEND=fake o (fuera de producción) faltan las claves VAPID; en producción sin claves lanza. */
export function getPush(): PushSender {
  const publica = process.env.VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (process.env.AI_BACKEND === 'fake') return (globalThis.__alfredoPush ??= new FakePushSender())
  if (!publica || !privada || !subject) {
    if (process.env.NODE_ENV === 'production') throw new PushNoConfiguradoError()
    return (globalThis.__alfredoPush ??= new FakePushSender())
  }
  return new WebPushSender(publica, privada, subject)
}
