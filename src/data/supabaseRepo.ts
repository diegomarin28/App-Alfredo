import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  CONSERVAR_NULL, ENTIDADES, TABLAS, validarPathArchivo, type Cambio, type Entidad, type Nuevo, type Repo, type Tabla,
} from './repo'
import type { Config } from '@/domain/tipos'
import { esIdInvalido, falla, leerTodo, type ErrorDb } from './supabaseUtil'
import { diaCorto } from '@/domain/fechaTexto'

const BUCKET = 'archivos'
const URL_SEGUNDOS = 60 * 60

const aSnake = (k: string) => k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
const aCamel = (k: string) => k.replace(/_([a-z])/g, (_, m: string) => m.toUpperCase())

function filaADb(o: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [aSnake(k), v]),
  )
}

/** null de la base → clave ausente, salvo las que el tipo declara `| null`. */
function dbAFila<T>(row: Record<string, unknown>, conservarNull: string[] = []): T {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([k, v]) => v !== null || conservarNull.includes(aCamel(k)))
      .map(([k, v]) => [aCamel(k), v]),
  ) as T
}

/**
 * Una columna nueva cuya migración puede no estar aplicada todavía: si PostgREST dice que no existe (PGRST204),
 * se reintenta con `plegar` (la fila sin esa columna). Se saca cuando la migración ya está en todos lados.
 */
export interface SinColumna { columna: string; plegar: (fila: Record<string, unknown>) => Record<string, unknown> }

/** Ronda 7 (migración 0010): sin pendientes.fecha, la fecha queda escrita al final del texto ("… (lunes 30/11)"). */
export const PENDIENTES_SIN_FECHA: SinColumna = {
  columna: 'fecha',
  plegar: ({ fecha, ...resto }) =>
    typeof fecha === 'string' && typeof resto.texto === 'string' ? { ...resto, texto: `${resto.texto} (${diaCorto(fecha)})` } : resto,
}

const faltaColumna = (error: ErrorDb, fila: Record<string, unknown>, sc?: SinColumna): sc is SinColumna =>
  !!sc && error?.code === 'PGRST204' && sc.columna in fila && error.message.includes(`'${sc.columna}'`)

/** Exportada solo para probarla con un cliente falso. */
export class TablaSupabase<E extends { id: string }> implements Tabla<E> {
  constructor(
    private db: SupabaseClient,
    private tabla: string,
    private opts: { conservarNull?: string[]; nuevoPrimero?: boolean; sinColumna?: SinColumna } = {},
  ) {}

  private conv = (row: Record<string, unknown>) => dbAFila<E>(row, this.opts.conservarNull)

  /** Pagina de a 1000 (tope de PostgREST); id desempata para que el orden sea total y estable. */
  async list(filtro?: Partial<E>): Promise<E[]> {
    const filas = await leerTodo<Record<string, unknown>>((desde, hasta) => {
      let q = this.db.from(this.tabla).select('*').match(filaADb(filtro ?? {}))
      q = this.opts.nuevoPrimero
        ? q.order('cuando', { ascending: false }).order('creado_en', { ascending: false })
        : q.order('creado_en', { ascending: true })
      return q.order('id', { ascending: true }).range(desde, hasta)
    }, `${this.tabla}.list`)
    return filas.map(this.conv)
  }

  async get(id: string): Promise<E | null> {
    const { data, error } = await this.db.from(this.tabla).select('*').eq('id', id).maybeSingle()
    if (esIdInvalido(error)) return null
    falla(error, `${this.tabla}.get`)
    return data ? this.conv(data) : null
  }

  async create(data: Nuevo<E>): Promise<E> {
    const insertar = (fila: Record<string, unknown>) => this.db.from(this.tabla).insert(fila).select().single()
    const fila = filaADb(data)
    let { data: row, error } = await insertar(fila)
    if (faltaColumna(error, fila, this.opts.sinColumna)) ({ data: row, error } = await insertar(this.opts.sinColumna.plegar(fila)))
    falla(error, `${this.tabla}.create`)
    return this.conv(row!)
  }

  async update(id: string, patch: Cambio<E>): Promise<E> {
    const cambiar = (fila: Record<string, unknown>) => this.db.from(this.tabla).update(fila).eq('id', id).select().maybeSingle()
    const fila = filaADb(patch)
    let { data: row, error } = await cambiar(fila)
    if (faltaColumna(error, fila, this.opts.sinColumna)) ({ data: row, error } = await cambiar(this.opts.sinColumna.plegar(fila)))
    if (esIdInvalido(error)) throw new Error(`No existe ${id}`)
    falla(error, `${this.tabla}.update`)
    if (!row) throw new Error(`No existe ${id}`)
    return this.conv(row)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from(this.tabla).delete().eq('id', id)
    if (esIdInvalido(error)) return
    falla(error, `${this.tabla}.remove`)
  }
}

export class SupabaseRepo implements Repo {
  fechas!: Repo['fechas']
  recordatorios!: Repo['recordatorios']
  vencimientos!: Repo['vencimientos']
  personasCasa!: Repo['personasCasa']
  eventosCasa!: Repo['eventosCasa']
  serviciosCasa!: Repo['serviciosCasa']
  contactos!: Repo['contactos']
  gruposContacto!: Repo['gruposContacto']
  pendientes!: Repo['pendientes']
  notas!: Repo['notas']
  carpetas!: Repo['carpetas']
  documentos!: Repo['documentos']
  fotos!: Repo['fotos']
  claves!: Repo['claves']
  usoIa!: Repo['usoIa']
  passkeys!: Repo['passkeys']
  suscripciones!: Repo['suscripciones']

  private db: SupabaseClient

  constructor(url?: string, serviceRoleKey?: string) {
    if (!url) throw new Error('Falta SUPABASE_URL')
    if (!serviceRoleKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    for (const e of ENTIDADES as Entidad[]) {
      ;(this as Record<string, unknown>)[e] = new TablaSupabase(this.db, TABLAS[e], {
        conservarNull: CONSERVAR_NULL[e] ?? [],
        nuevoPrimero: e === 'eventosCasa',
        ...(e === 'pendientes' ? { sinColumna: PENDIENTES_SIN_FECHA } : {}),
      })
    }
  }

  async getConfig(): Promise<Config> {
    const { data, error } = await this.db.from('config').select('*').eq('id', 1).single()
    falla(error, 'config.get')
    const { id: _id, ...resto } = dbAFila<Config & { id: number }>(data!)
    return resto
  }

  async setConfig(patch: Partial<Config>): Promise<Config> {
    const { error } = await this.db.from('config').update(filaADb(patch)).eq('id', 1)
    falla(error, 'config.set')
    return this.getConfig()
  }

  async uploadArchivo(path: string, blob: Blob): Promise<string> {
    validarPathArchivo(path)
    const { error } = await this.db.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || undefined,
      upsert: true,
    })
    falla(error, 'storage.upload')
    return path
  }

  async removeArchivo(path: string): Promise<void> {
    validarPathArchivo(path)
    const { error } = await this.db.storage.from(BUCKET).remove([path])
    falla(error, 'storage.remove')
  }

  async urlArchivo(path: string): Promise<string> {
    const { data, error } = await this.db.storage.from(BUCKET).createSignedUrl(path, URL_SEGUNDOS)
    falla(error, 'storage.signedUrl')
    return data!.signedUrl
  }
}
