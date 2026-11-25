import type { Repo, Tabla } from '@/data/repo'
import { normalizarBusqueda } from '@/domain/contactos'
import { hoy } from '@/domain/fechas'
import { esMuletilla, sinMuletillas } from '@/domain/muletillas'
import { corregirNombres } from '@/domain/nombres'
import { fechasLegibles } from '@/domain/fechaTexto'
import { MAX_NOTA } from '@/domain/vencimientos'
import { describir, textoLegible, textoLibre, validarAccion } from './acciones'
import { MODELO_CONTAME, type AiArgs, type AiClient } from './client'
import { construirSistema, construirUsuario, HERRAMIENTAS, type Accion, type ContextoContame, type Opcion } from './contamePrompt'
import type { EmailSender } from './email'
import { usarIa } from './presupuesto'

export { describir, validarAccion } from './acciones'
export type { Accion, Opcion } from './contamePrompt'

export const OPCION_OTRA_COSA: Opcion = { etiqueta: 'Otra cosa · guardar en Tareas pendientes', respuesta: 'otra cosa' }
export const MAX_TEXTO_CONTAME = 8000
export const MAX_RESPUESTA = 500
/** Preguntas como máximo; después se guarda en Tareas pendientes. */
export const MAX_RONDAS = 3
const MAX_ACCIONES = 200
const MAX_OPCIONES = 5
export const AVISO_CORTADA = 'Era mucho para ordenar de una vez: te lo dejo como nota para que lo revises.'

export interface Guardado { accion: Accion; id: string; descripcion: string }
export interface Guardados { guardado: Guardado[]; loteId: string }
/**
 * Ronda 6: Contame revisa antes de guardar. La IA propone; Alfredo revisa "Esto es lo que entendí" y recién con
 * "Guardar todo" se guarda (guardarPropuesta). `noEntendi`: lo que no entendió, en filas aparte.
 */
export interface Propuesta { acciones: Accion[]; noEntendi: string[]; aviso?: string }
export type ResultadoContame = { propuesta: Propuesta } | { pregunta: string; opciones: Opcion[] }
export interface EntradaContame { texto: string; respuestas?: string[] }

/** Entidades que pueden venir de Contame (llevan loteId). */
const TABLAS_LOTE = [
  'fechas', 'recordatorios', 'vencimientos', 'personasCasa', 'eventosCasa',
  'serviciosCasa', 'contactos', 'pendientes', 'notas',
] as const

const esOtraCosa = (s: string) => normalizarBusqueda(s).startsWith('otra cosa')

/** Nombres que se le pasan a la IA para que los escriba bien (como mucho). */
const MAX_NOMBRES = 300

export async function contextoContame(repo: Repo): Promise<ContextoContame> {
  const [personas, contactos, fechas] = await Promise.all([repo.personasCasa.list(), repo.contactos.list(), repo.fechas.list()])
  // ronda 6: los nombres y apellidos que ya hay en Calendario, Contactos y Casas
  const nombres = [...new Set([...fechas, ...contactos, ...personas].map((x) => x.nombre.trim()).filter(Boolean))]
  return {
    hoy: hoy(),
    personas: personas.map((p) => ({ nombre: p.nombre, rol: p.rol, casa: p.casa })),
    contactos: contactos.map((c) => c.nombre),
    nombres: nombres.slice(0, MAX_NOMBRES),
  }
}

// ---------- salida del modelo (no confiable, R28) ----------

type Clasificacion = { acciones: unknown[]; noEntendi: unknown[] } | { pregunta: string; opciones: Opcion[] } | { sinClasificar: true } | { cortada: true }

const cadena = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t && t.length <= max ? t : null
}

export function validarPregunta(raw: unknown): { pregunta: string; opciones: Opcion[] } | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const pregunta = cadena(o.pregunta, 300)
  if (!pregunta || !Array.isArray(o.opciones)) return null
  const opciones: Opcion[] = []
  for (const x of o.opciones) {
    if (!x || typeof x !== 'object') continue
    const etiqueta = cadena((x as Record<string, unknown>).etiqueta, 60)
    const respuesta = cadena((x as Record<string, unknown>).respuesta, 200)
    if (!etiqueta || !respuesta || esOtraCosa(etiqueta) || esOtraCosa(respuesta)) continue
    if (opciones.some((p) => p.etiqueta === etiqueta)) continue
    opciones.push({ etiqueta, respuesta })
  }
  if (opciones.length === 0) return null
  return { pregunta, opciones: [...opciones.slice(0, MAX_OPCIONES), OPCION_OTRA_COSA] }
}

// ---------- guardar ----------

async function crear(repo: Repo, a: Accion, loteId: string): Promise<string> {
  switch (a.tipo) {
    case 'eventoCasa': return (await repo.eventosCasa.create({ casa: a.casa, que: a.que, cuando: a.cuando, loteId })).id
    case 'personaCasa': {
      const { tipo: _t, ...datos } = a
      return (await repo.personasCasa.create({ ...datos, loteId })).id
    }
    case 'servicioCasa': return (await repo.serviciosCasa.create({ casa: a.casa, clave: a.clave, valor: a.valor, loteId })).id
    case 'pendiente': return (await repo.pendientes.create({ texto: a.texto, ...(a.fecha ? { fecha: a.fecha } : {}), hecho: false, loteId })).id
    case 'nota': return (await repo.notas.create({ texto: a.texto, origen: 'voz', loteId })).id
    case 'contacto': {
      const { tipo: _t, ...datos } = a
      return (await repo.contactos.create({ ...datos, loteId })).id
    }
    case 'fecha': {
      const { tipo: _t, tipoFecha, ...datos } = a
      return (await repo.fechas.create({ ...datos, tipo: tipoFecha, loteId })).id
    }
    case 'recordatorio': return (await repo.recordatorios.create({ titulo: a.titulo, dia: a.dia, avisarDiasAntes: a.avisarDiasAntes, loteId })).id
    case 'vencimiento': return (await repo.vencimientos.create({
      titulo: a.titulo, ambito: a.ambito, fecha: a.fecha, avisarDiasAntes: a.avisarDiasAntes, hecho: false, loteId,
    })).id
  }
}

// ---------- propuesta ----------

/** Los textos de una acción pasan por el diccionario de nombres (Henrique → Gericke). */
function corregirAccion(a: Accion, nombres: string[]): Accion {
  const c = (t: string) => corregirNombres(t, nombres)
  switch (a.tipo) {
    case 'eventoCasa': return { ...a, que: c(a.que) }
    case 'personaCasa': return { ...a, nombre: c(a.nombre), ...(a.detalle ? { detalle: c(a.detalle) } : {}) }
    case 'servicioCasa': return a
    case 'pendiente': return { ...a, texto: sinMuletillas(c(a.texto)) }
    case 'nota': return { ...a, texto: sinMuletillas(c(a.texto)) }
    case 'contacto': return { ...a, nombre: c(a.nombre), ...(a.nota ? { nota: c(a.nota) } : {}) }
    case 'fecha': return { ...a, nombre: c(a.nombre) }
    case 'recordatorio': return { ...a, titulo: c(a.titulo) }
    case 'vencimiento': return { ...a, titulo: c(a.titulo) }
  }
}

/** Lo que no entendió: textos cortos, sin muletillas ni repetidos. */
function fragmentos(crudos: unknown[], nombres: string[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const x of crudos) {
    const t = typeof x === 'string' ? fechasLegibles(sinMuletillas(corregirNombres(x.trim(), nombres))) : ''
    if (!t || t.length > MAX_NOTA || esMuletilla(t)) continue
    const k = normalizarBusqueda(t)
    if (vistos.has(k)) continue
    vistos.add(k)
    out.push(t)
  }
  return out
}

/**
 * Arma "Esto es lo que entendí" con lo que devolvió la IA. Sin guardar nada. Las tareas y notas que son solo
 * muletillas ("eh", "perdón", "hay una vez") se descartan; lo inválido va a "No entendí".
 */
export function armarPropuesta(crudas: unknown[], noEntendi: unknown[], texto: string, hoyStr: string, nombres: string[] = []): Propuesta {
  const acciones: Accion[] = []
  const dudas: unknown[] = [...noEntendi]
  if (crudas.length > MAX_ACCIONES) return { acciones: [], noEntendi: fragmentos([texto], nombres) }
  for (const c of crudas) {
    const v = validarAccion(c, hoyStr)
    if (!v) {
      dudas.push(textoLegible(c) || texto)
      continue
    }
    const a = corregirAccion(v, nombres)
    if ((a.tipo === 'pendiente' || a.tipo === 'nota') && esMuletilla(a.texto)) continue
    acciones.push(a)
  }
  const lista = fragmentos(dudas, nombres)
  // la IA no devolvió nada útil: que no se pierda lo que dijo (va a "No entendí", que por defecto se descarta)
  if (acciones.length === 0 && lista.length === 0 && !esMuletilla(texto)) lista.push(...fragmentos([texto], nombres))
  return { acciones, noEntendi: lista }
}

// ---------- guardar ----------

export const ERROR_REVISAR = 'Revisá lo que entendí: hay algo que no se puede guardar así.'

/** "Guardar todo": valida de nuevo cada fila (vienen del teléfono) y guarda todo con un mismo loteId. */
export async function guardarPropuesta(repo: Repo, crudas: unknown[], hoyStr: string): Promise<Guardados | { error: string }> {
  if (crudas.length === 0 || crudas.length > MAX_ACCIONES) return { error: 'No hay nada para guardar.' }
  const acciones: Accion[] = []
  for (const c of crudas) {
    const a = validarAccion(c, hoyStr)
    if (!a) return { error: ERROR_REVISAR }
    acciones.push(a)
  }
  const loteId = crypto.randomUUID()
  const guardado: Guardado[] = []
  try {
    for (const a of acciones) guardado.push({ accion: a, id: await crear(repo, a, loteId), descripcion: describir(a) })
  } catch (e) {
    await deshacerLote(repo, loteId).catch((err) => console.error('[contame] no se pudo limpiar el lote', err))
    throw e
  }
  return { guardado, loteId }
}

/** Borra todo lo creado con ese lote. Devuelve cuántas filas borró. */
export async function deshacerLote(repo: Repo, loteId: string): Promise<number> {
  if (!loteId) throw new Error('loteId vacío')
  let n = 0
  for (const t of TABLAS_LOTE) {
    const tabla = repo[t] as unknown as Tabla<{ id: string; loteId?: string }>
    const filas = await tabla.list({ loteId })
    for (const f of filas) {
      if (f.loteId !== loteId) continue
      await tabla.remove(f.id)
      n++
    }
  }
  return n
}

// ---------- IA ----------

/**
 * El pedido de clasificación (también lo usa scripts/probar-haiku.ts).
 * Haiku 5.5 acepta forzar la herramienta (any): siempre llama a guardar o preguntar,
 * y forzada no piensa, así que los 2000 tokens van a la herramienta.
 */
export function pedidoClasificacion(nombre: string, texto: string, respuestas: string[], ctx: ContextoContame): AiArgs {
  return {
    modelo: MODELO_CONTAME,
    sistema: construirSistema(nombre),
    mensajes: [{ rol: 'user', texto: construirUsuario(texto, respuestas, ctx) }],
    maxTokens: 2000,
    herramientas: HERRAMIENTAS,
    forzarHerramienta: true,
    unaSolaHerramienta: true,
  }
}

export async function clasificar(
  repo: Repo, ai: AiClient, email: EmailSender, texto: string, respuestas: string[], ctx: ContextoContame,
): Promise<Clasificacion> {
  const config = await repo.getConfig()
  const r = await usarIa(repo, ai, email, pedidoClasificacion(config.nombre, texto, respuestas, ctx))
  // Cortada por max_tokens (un texto muy largo no entra en 2000): la herramienta puede venir a medias.
  if (r.stopReason === 'max_tokens') return { cortada: true }
  // Rechazo: puede cortar una herramienta a medias; nunca se usa.
  if (r.stopReason === 'refusal') return { sinClasificar: true }
  const input = r.toolInput as Record<string, unknown> | undefined
  if (r.toolName === 'guardar' && input && Array.isArray(input.acciones)) {
    const noEntendi = Array.isArray(input.noEntendi) ? input.noEntendi : []
    if (input.acciones.length > 0 || noEntendi.length > 0) return { acciones: input.acciones, noEntendi }
  }
  if (r.toolName === 'preguntar') {
    const p = validarPregunta(input)
    if (p) return p
  }
  return { sinClasificar: true }
}

/**
 * Contame: clasifica con la IA (o pregunta) y devuelve la propuesta, sin guardar (ronda 6).
 * Sin estado: el cliente reenvía texto + respuestas, y después manda lo revisado a guardarPropuesta.
 */
export async function contame(repo: Repo, ai: AiClient, email: EmailSender, entrada: EntradaContame): Promise<ResultadoContame> {
  const respuestas = entrada.respuestas ?? []
  const hoyStr = hoy()
  const ctx = await contextoContame(repo)
  // ronda 6: el dictado cambia apellidos; se corrige antes de ordenar
  const texto = corregirNombres(entrada.texto.trim(), ctx.nombres)
  const ultima = respuestas[respuestas.length - 1]
  if (ultima !== undefined && esOtraCosa(ultima)) return { propuesta: { acciones: textoLibre(texto), noEntendi: [] } }

  const c = await clasificar(repo, ai, email, texto, respuestas, ctx)
  if ('cortada' in c) return { propuesta: { acciones: textoLibre(texto, true), noEntendi: [], aviso: AVISO_CORTADA } }
  if ('pregunta' in c) {
    if (respuestas.length >= MAX_RONDAS) return { propuesta: { acciones: textoLibre(texto), noEntendi: [] } }
    return c
  }
  if ('sinClasificar' in c) return { propuesta: armarPropuesta([], [], texto, hoyStr, ctx.nombres) }
  return { propuesta: armarPropuesta(c.acciones, c.noEntendi, texto, hoyStr, ctx.nombres) }
}
