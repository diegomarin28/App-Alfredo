import type { Repo, Tabla } from '@/data/repo'
import { nombreCasa, validarEventoCasa, validarPersonaCasa, validarServicioCasa } from '@/domain/casas'
import { normalizarBusqueda, validarContacto } from '@/domain/contactos'
import { hoy } from '@/domain/fechas'
import { fechaLarga, validarRecordatorio } from '@/domain/recordatorios'
import { validarFecha } from '@/domain/validarFecha'
import { fechaCompleta, MAX_NOTA, MAX_PENDIENTE, validarNota, validarPendiente, validarVencimiento } from '@/domain/vencimientos'
import type { AiClient } from './client'
import { construirSistema, construirUsuario, HERRAMIENTAS, type Accion, type ContextoContame, type Opcion } from './contamePrompt'
import type { EmailSender } from './email'
import { usarIa } from './presupuesto'

export type { Accion, Opcion } from './contamePrompt'

export const OPCION_OTRA_COSA: Opcion = { etiqueta: 'Otra cosa · guardar en Pendientes', respuesta: 'otra cosa' }
export const MAX_TEXTO_CONTAME = 8000
export const MAX_RESPUESTA = 500
/** Preguntas como máximo; después se guarda en Pendientes. */
export const MAX_RONDAS = 3
const MAX_ACCIONES = 200
const MAX_OPCIONES = 5
export const AVISO_CORTADA = 'Era mucho para ordenar de una vez: lo guardé todo como nota para que lo revises.'

export interface Guardado { accion: Accion; id: string; descripcion: string }
export interface Guardados { guardado: Guardado[]; loteId: string; aviso?: string }
export type ResultadoContame = Guardados | { pregunta: string; opciones: Opcion[] }
export interface EntradaContame { texto: string; respuestas?: string[] }

/** Entidades que pueden venir de Contame (llevan loteId). */
const TABLAS_LOTE = [
  'fechas', 'recordatorios', 'vencimientos', 'personasCasa', 'eventosCasa',
  'serviciosCasa', 'contactos', 'pendientes', 'notas',
] as const

const esOtraCosa = (s: string) => normalizarBusqueda(s).startsWith('otra cosa')

export async function contextoContame(repo: Repo): Promise<ContextoContame> {
  const [personas, contactos] = await Promise.all([repo.personasCasa.list(), repo.contactos.list()])
  return {
    hoy: hoy(),
    personas: personas.map((p) => ({ nombre: p.nombre, rol: p.rol, casa: p.casa })),
    contactos: contactos.map((c) => c.nombre),
  }
}

// ---------- salida del modelo (no confiable, R28) ----------

type Clasificacion = { acciones: unknown[] } | { pregunta: string; opciones: Opcion[] } | { sinClasificar: true } | { cortada: true }

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

const MMDD = /^(\d{2})-(\d{2})$/

/** Valida una acción con los validadores del dominio. null si no sirve. */
export function validarAccion(raw: unknown, hoyStr: string): Accion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '')
  const opc = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined)
  const entero = (k: string, porDefecto: number) => (o[k] === undefined || o[k] === null ? porDefecto : typeof o[k] === 'number' ? (o[k] as number) : NaN)
  switch (o.tipo) {
    case 'eventoCasa': {
      const r = validarEventoCasa({ casa: s('casa'), que: s('que'), cuando: s('cuando') }, hoyStr)
      return r.ok ? { tipo: 'eventoCasa', ...r.valor } : null
    }
    case 'personaCasa': {
      const r = validarPersonaCasa({ casa: s('casa'), nombre: s('nombre'), rol: s('rol'), detalle: opc('detalle'), telefono: opc('telefono') })
      return r.ok ? { tipo: 'personaCasa', ...r.valor } : null
    }
    case 'servicioCasa': {
      const r = validarServicioCasa({ casa: s('casa'), clave: s('clave'), valor: s('valor') })
      return r.ok ? { tipo: 'servicioCasa', ...r.valor } : null
    }
    case 'pendiente': {
      const r = validarPendiente(s('texto'))
      return r.ok ? { tipo: 'pendiente', texto: r.valor } : null
    }
    case 'nota': {
      const r = validarNota(s('texto'))
      return r.ok ? { tipo: 'nota', texto: r.valor } : null
    }
    case 'contacto': {
      const r = validarContacto({
        nombre: s('nombre'), tipo: o.tipoContacto === undefined ? 'otro' : s('tipoContacto'),
        empresa: opc('empresa'), telefono: opc('telefono'), nota: opc('nota'),
      })
      if (!r.ok) return null
      const { tipo, ...resto } = r.valor
      return { tipo: 'contacto', tipoContacto: tipo, ...resto }
    }
    case 'fecha': {
      const m = MMDD.exec(s('dia'))
      if (!m) return null
      const anio = o.anioNacimiento === undefined || o.anioNacimiento === null ? null : entero('anioNacimiento', NaN)
      const r = validarFecha({ nombre: s('nombre'), tipo: s('tipoFecha'), dia: Number(m[2]), mes: Number(m[1]), anio }, Number(hoyStr.slice(0, 4)))
      if (!r.ok || (anio !== null && r.valor.anioNacimiento === undefined)) return null
      const { tipo, ...resto } = r.valor
      return { tipo: 'fecha', tipoFecha: tipo, ...resto }
    }
    case 'recordatorio': {
      const m = MMDD.exec(s('dia'))
      if (!m) return null
      const r = validarRecordatorio({ titulo: s('titulo'), dia: Number(m[2]), mes: Number(m[1]), avisarDiasAntes: entero('avisarDiasAntes', 30) })
      if (!r.ok || r.valor.dia === null) return null
      return { tipo: 'recordatorio', titulo: r.valor.titulo, dia: r.valor.dia, avisarDiasAntes: r.valor.avisarDiasAntes }
    }
    case 'vencimiento': {
      const r = validarVencimiento({ titulo: s('titulo'), ambito: s('ambito'), fecha: s('fecha'), avisarDiasAntes: entero('avisarDiasAntes', 7) })
      if (!r.ok) return null
      const { titulo, ambito, fecha, avisarDiasAntes } = r.valor
      return { tipo: 'vencimiento', titulo, ambito, fecha, avisarDiasAntes }
    }
    default:
      return null
  }
}

/** Texto legible de una acción inválida, para no perderla. */
const CAMPOS_LEGIBLES = ['que', 'texto', 'titulo', 'nombre', 'rol', 'clave', 'valor', 'empresa', 'detalle', 'telefono', 'nota', 'casa', 'cuando', 'fecha', 'dia', 'ambito']
function textoLegible(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (!raw || typeof raw !== 'object') return ''
  const o = raw as Record<string, unknown>
  return CAMPOS_LEGIBLES.map((k) => o[k]).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim()).join(' · ')
}

/** Texto sin clasificar: pendiente si entra (y no se pide nota); si no, nota(s) de voz. */
function textoLibre(texto: string, comoNota = false): Accion[] {
  const t = texto.trim()
  if (!t) return []
  if (t.length <= MAX_PENDIENTE && !comoNota) return [{ tipo: 'pendiente', texto: t }]
  const notas: Accion[] = []
  let resto = t
  while (resto.length > MAX_NOTA) {
    const corte = resto.lastIndexOf(' ', MAX_NOTA)
    const i = corte > MAX_NOTA / 2 ? corte : MAX_NOTA
    notas.push({ tipo: 'nota', texto: resto.slice(0, i).trim() })
    resto = resto.slice(i).trim()
  }
  if (resto) notas.push({ tipo: 'nota', texto: resto })
  return notas
}

// ---------- guardar ----------

const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t)
const NOMBRE_FECHA = { cumple: 'cumpleaños', aniversario: 'aniversario', otra: 'fecha' } as const

export function describir(a: Accion): string {
  switch (a.tipo) {
    case 'eventoCasa': return `Historial de ${nombreCasa(a.casa)}: ${recortar(a.que, 120)} (${fechaLarga(a.cuando.slice(5))})`
    case 'personaCasa': return `Quién se ocupa en ${nombreCasa(a.casa)}: ${a.nombre} (${a.rol})`
    case 'servicioCasa': return `Servicios de ${nombreCasa(a.casa)}: ${a.clave}, ${recortar(a.valor, 80)}`
    case 'pendiente': return `Pendientes: ${a.texto}`
    case 'nota': return `Notas: ${recortar(a.texto, 120)}`
    case 'contacto': return `Contactos: ${a.nombre}${a.empresa ? ` (${a.empresa})` : ''}`
    case 'fecha': return `Calendario: ${NOMBRE_FECHA[a.tipoFecha]} de ${a.nombre} (${fechaLarga(a.dia)})`
    case 'recordatorio': return `Recordatorios: ${a.titulo} (${fechaLarga(a.dia)})`
    case 'vencimiento': return `Vencimientos: ${a.titulo} (${fechaCompleta(a.fecha)})`
  }
}

async function crear(repo: Repo, a: Accion, loteId: string): Promise<string> {
  switch (a.tipo) {
    case 'eventoCasa': return (await repo.eventosCasa.create({ casa: a.casa, que: a.que, cuando: a.cuando, loteId })).id
    case 'personaCasa': {
      const { tipo: _t, ...datos } = a
      return (await repo.personasCasa.create({ ...datos, loteId })).id
    }
    case 'servicioCasa': return (await repo.serviciosCasa.create({ casa: a.casa, clave: a.clave, valor: a.valor, loteId })).id
    case 'pendiente': return (await repo.pendientes.create({ texto: a.texto, hecho: false, loteId })).id
    case 'nota': return (await repo.notas.create({ texto: a.texto, origen: 'voz', loteId })).id
    case 'contacto': {
      const { tipo: _t, tipoContacto, ...datos } = a
      return (await repo.contactos.create({ ...datos, tipo: tipoContacto, loteId })).id
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

/** Valida y guarda todo con un mismo loteId. Lo inválido va a Pendientes; nada se pierde. */
export async function guardarAcciones(
  repo: Repo, crudas: unknown[], texto: string, hoyStr: string, comoNota = false,
): Promise<Guardados> {
  let textoUsado = false
  const todoElTexto = (): Accion[] => {
    if (textoUsado) return []
    textoUsado = true
    return textoLibre(texto, comoNota)
  }
  const acciones: Accion[] = []
  if (crudas.length === 0 || crudas.length > MAX_ACCIONES) acciones.push(...todoElTexto())
  for (const c of crudas.slice(0, MAX_ACCIONES)) {
    const a = validarAccion(c, hoyStr)
    if (a) acciones.push(a)
    else {
      const legible = textoLegible(c)
      acciones.push(...(legible ? textoLibre(legible) : todoElTexto()))
    }
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

export async function clasificar(
  repo: Repo, ai: AiClient, email: EmailSender, texto: string, respuestas: string[], ctx: ContextoContame,
): Promise<Clasificacion> {
  const config = await repo.getConfig()
  const r = await usarIa(repo, ai, email, {
    sistema: construirSistema(config.nombre),
    mensajes: [{ rol: 'user', texto: construirUsuario(texto, respuestas, ctx) }],
    maxTokens: 16000,
    herramientas: HERRAMIENTAS,
    unaSolaHerramienta: true,
  })
  // Cortada por max_tokens: la herramienta puede venir a medias (p. ej. solo las primeras acciones).
  if (r.stopReason === 'max_tokens') return { cortada: true }
  // Rechazo: puede cortar una herramienta a medias; nunca se usa.
  if (r.stopReason === 'refusal') return { sinClasificar: true }
  const input = r.toolInput as Record<string, unknown> | undefined
  if (r.toolName === 'guardar' && input && Array.isArray(input.acciones) && input.acciones.length > 0) {
    return { acciones: input.acciones }
  }
  if (r.toolName === 'preguntar') {
    const p = validarPregunta(input)
    if (p) return p
  }
  return { sinClasificar: true }
}

/** Contame: clasifica con la IA (o pregunta) y guarda. Sin estado: el cliente reenvía texto + respuestas. */
export async function contame(repo: Repo, ai: AiClient, email: EmailSender, entrada: EntradaContame): Promise<ResultadoContame> {
  const texto = entrada.texto.trim()
  const respuestas = entrada.respuestas ?? []
  const hoyStr = hoy()
  const ultima = respuestas[respuestas.length - 1]
  if (ultima !== undefined && esOtraCosa(ultima)) return guardarAcciones(repo, [], texto, hoyStr)

  const c = await clasificar(repo, ai, email, texto, respuestas, await contextoContame(repo))
  if ('cortada' in c) return { ...(await guardarAcciones(repo, [], texto, hoyStr, true)), aviso: AVISO_CORTADA }
  if ('pregunta' in c) {
    if (respuestas.length >= MAX_RONDAS) return guardarAcciones(repo, [], texto, hoyStr)
    return c
  }
  return guardarAcciones(repo, 'acciones' in c ? c.acciones : [], texto, hoyStr)
}
