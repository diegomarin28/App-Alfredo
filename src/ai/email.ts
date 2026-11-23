import 'server-only'
import { Resend } from 'resend'

export interface EmailSender {
  enviar(to: string, asunto: string, texto: string): Promise<void>
}

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend
  constructor(apiKey: string, private readonly from = 'App Alfredo <onboarding@resend.dev>') {
    this.resend = new Resend(apiKey)
  }

  async enviar(to: string, asunto: string, texto: string): Promise<void> {
    const { error } = await this.resend.emails.send({ from: this.from, to, subject: asunto, text: texto })
    if (error) throw new Error(`Resend: ${error.message}`)
  }
}

/** Para tests y e2e: guarda los mails en memoria. */
export class FakeEmailSender implements EmailSender {
  enviados: { to: string; asunto: string; texto: string }[] = []
  fallar = false

  async enviar(to: string, asunto: string, texto: string): Promise<void> {
    if (this.fallar) throw new Error('fallo simulado del mail')
    this.enviados.push({ to, asunto, texto })
  }
}
