import type { Repo } from '@/data/repo'
import type { AiArgs, AiClient, AiResultado } from './client'
import type { EmailSender } from './email'
import { costoUsd, tokensPrompt } from './precios'

export class SinSaldoError extends Error {
  constructor() {
    super('Se terminó el saldo de la IA, avisale a Diego.')
    this.name = 'SinSaldoError'
  }
}

export class ConfigIaError extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ConfigIaError'
  }
}

function numeroEnv(nombre: string, porDefecto: number): number {
  const crudo = process.env[nombre]
  if (crudo === undefined || crudo.trim() === '') return porDefecto
  const n = Number(crudo)
  if (!Number.isFinite(n) || n < 0) throw new ConfigIaError(`${nombre} inválido: "${crudo}" (debe ser un número ≥ 0).`)
  return n
}

let avisoSinMail = false

/** Llama a la IA con control de saldo (suma el costo de todos los modelos). Lanza SinSaldoError antes de llamar si ya se gastó todo. */
export async function usarIa(repo: Repo, ai: AiClient, email: EmailSender, args: AiArgs): Promise<AiResultado> {
  const presupuesto = numeroEnv('AI_BUDGET_USD', 20)
  const alerta = numeroEnv('AI_ALERT_USD', 16)

  const suma = async () => (await repo.usoIa.list()).reduce((s, u) => s + u.costoUsd, 0)
  if ((await suma()) >= presupuesto) throw new SinSaldoError()

  const r = await ai.completar(args)
  // Precio del modelo que respondió; tokensIn guardado = toda la entrada (sin caché + caché).
  await repo.usoIa.create({ tokensIn: tokensPrompt(r), tokensOut: r.tokensOut, costoUsd: costoUsd(r.modelo, r) })

  const total = await suma()
  if (total >= alerta && !(await repo.getConfig()).alertaIaEnviada) {
    const to = process.env.ALERT_EMAIL
    if (!to) {
      if (!avisoSinMail) {
        avisoSinMail = true
        console.error('[ia] Falta ALERT_EMAIL: no se puede avisar que queda poco saldo.')
      }
    } else {
      try {
        await email.enviar(
          to,
          'App Alfredo: queda poco saldo de IA',
          `Hola Diego: ya se gastaron ${total.toFixed(2)} USD de los ${presupuesto} USD de saldo de la IA de App Alfredo. Conviene cargar saldo pronto.`,
        )
        await repo.setConfig({ alertaIaEnviada: true })
      } catch (e) {
        console.error('[ia] No se pudo mandar el aviso de poco saldo; se reintenta en el próximo uso.', e)
      }
    }
  }
  return r
}
