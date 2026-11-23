import type { Repo } from '@/data/repo'
import type { AiClient } from './client'
import type { EmailSender } from './email'
import { usarIa } from './presupuesto'

export type Variante = 'formal' | 'otra'
export type EntradaMensaje =
  | { modo: 'responder'; mensaje: string; variante?: Variante; anterior?: string }
  | { modo: 'escribir'; destinatario: string; idea: string; variante?: Variante; anterior?: string }

export function construirSistema(nombre: string, estilo: string): string {
  return [
    `Escribís mensajes de WhatsApp en español de Uruguay, en nombre de ${nombre}, como si los escribiera él.`,
    estilo.trim() ? `Notas sobre cómo escribe ${nombre}:\n${estilo}` : '',
    'Reglas: el mensaje tiene que estar listo para pegar en WhatsApp. Respondé SOLO con el texto del mensaje, sin introducción, sin explicaciones y sin comillas. Máximo 80 palabras. Nunca inventes datos que no estén en lo que te pasan (fechas, montos, nombres, lugares). Si no sabés el nombre de la persona, usá un marcador como [nombre].',
  ].filter(Boolean).join('\n\n')
}

export function construirUsuario(e: EntradaMensaje): string {
  const base = e.modo === 'responder'
    ? `Me escribieron este mensaje:\n${e.mensaje}\n\nEscribí una respuesta.`
    : `Quiero escribirle a: ${e.destinatario}\nLo que le quiero decir: ${e.idea}\n\nEscribí el mensaje.`
  if (e.anterior && e.variante === 'formal') return `${base}\n\nReescribí este mensaje más formal: ${e.anterior}`
  if (e.anterior && e.variante === 'otra') return `${base}\n\nDame otra versión distinta de: ${e.anterior}`
  return base
}

const PAREJAS: [string, string][] = [['"', '"'], ['“', '”'], ['«', '»'], ["'", "'"]]

export function limpiarRespuesta(texto: string): string {
  let t = texto.trim()
  // Preámbulo tipo "Acá va:" (primera línea corta terminada en ":" y más texto después)
  const m = t.match(/^([^\n]{1,40}):[ \t]*\n+([\s\S]+)$/)
  if (m && /^(ac[áa]|aqu[íi]|este es|esta es|claro|dale|listo|va)(?![\p{L}])/iu.test(m[1].trim())) t = m[2].trim()
  for (const [a, b] of PAREJAS) {
    if (t.length >= 2 && t.startsWith(a) && t.endsWith(b)) {
      t = t.slice(1, -1).trim()
      break
    }
  }
  return t
}

export async function generarMensaje(repo: Repo, ai: AiClient, email: EmailSender, entrada: EntradaMensaje): Promise<string> {
  const config = await repo.getConfig()
  const r = await usarIa(repo, ai, email, {
    sistema: construirSistema(config.nombre, config.estiloEscritura),
    mensajes: [{ rol: 'user', texto: construirUsuario(entrada) }],
    maxTokens: 400,
  })
  return limpiarRespuesta(r.texto)
}
