import {
  CARPETAS_INICIALES, CONSERVAR_NULL, CONFIG_POR_DEFECTO, ENTIDADES, RECORDATORIOS_INICIALES,
  validarPathArchivo, type Cambio, type Entidad, type Nuevo, type Repo, type Tabla,
} from './repo'
import type { Config } from '@/domain/tipos'

type Fila = { id: string; creadoEn?: string } & Record<string, unknown>

class TablaMemoria<E extends { id: string }> implements Tabla<E> {
  private filas = new Map<string, Fila>()
  private orden = 0
  private posicion = new Map<string, number>()

  constructor(private nuevoPrimero?: (a: Fila, b: Fila) => number, private conservarNull: string[] = []) {}

  vaciar() {
    this.filas.clear()
    this.posicion.clear()
  }

  async list(filtro?: Partial<E>): Promise<E[]> {
    const pares = Object.entries(filtro ?? {}).filter(([, v]) => v !== undefined)
    const filas = [...this.filas.values()].filter((f) => pares.every(([k, v]) => f[k] === v))
    const pos = (f: Fila) => this.posicion.get(f.id)!
    if (this.nuevoPrimero) filas.sort((a, b) => this.nuevoPrimero!(a, b) || pos(b) - pos(a))
    return filas.map((f) => ({ ...f }) as unknown as E)
  }

  async get(id: string): Promise<E | null> {
    const f = this.filas.get(id)
    return f ? ({ ...f } as unknown as E) : null
  }

  async create(data: Nuevo<E>): Promise<E> {
    const fila = { ...limpiar(data), id: crypto.randomUUID() } as Fila
    fila.creadoEn ??= new Date().toISOString()
    this.filas.set(fila.id, fila)
    this.posicion.set(fila.id, this.orden++)
    return { ...fila } as unknown as E
  }

  async update(id: string, patch: Cambio<E>): Promise<E> {
    const actual = this.filas.get(id)
    if (!actual) throw new Error(`No existe ${id}`)
    const fila: Fila = { ...actual, ...limpiar(patch), id }
    for (const [k, v] of Object.entries(patch)) if (v === null && !this.conservarNull.includes(k)) delete fila[k]
    this.filas.set(id, fila)
    return { ...fila } as unknown as E
  }

  async remove(id: string): Promise<void> {
    this.filas.delete(id)
    this.posicion.delete(id)
  }
}

/** Saca las claves undefined (igual que al serializar hacia Supabase). */
function limpiar(o: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
}

const masNuevoPrimero = (a: Fila, b: Fila) =>
  String(b.cuando).localeCompare(String(a.cuando)) || String(b.creadoEn).localeCompare(String(a.creadoEn))

export class MemoryRepo implements Repo {
  fechas = new TablaMemoria<never>() as unknown as Repo['fechas']
  recordatorios = new TablaMemoria<never>(undefined, CONSERVAR_NULL.recordatorios) as unknown as Repo['recordatorios']
  vencimientos = new TablaMemoria<never>() as unknown as Repo['vencimientos']
  personasCasa = new TablaMemoria<never>() as unknown as Repo['personasCasa']
  eventosCasa = new TablaMemoria<never>(masNuevoPrimero) as unknown as Repo['eventosCasa']
  serviciosCasa = new TablaMemoria<never>() as unknown as Repo['serviciosCasa']
  contactos = new TablaMemoria<never>() as unknown as Repo['contactos']
  pendientes = new TablaMemoria<never>() as unknown as Repo['pendientes']
  notas = new TablaMemoria<never>() as unknown as Repo['notas']
  carpetas = new TablaMemoria<never>() as unknown as Repo['carpetas']
  documentos = new TablaMemoria<never>() as unknown as Repo['documentos']
  fotos = new TablaMemoria<never>() as unknown as Repo['fotos']
  claves = new TablaMemoria<never>() as unknown as Repo['claves']
  usoIa = new TablaMemoria<never>() as unknown as Repo['usoIa']
  passkeys = new TablaMemoria<never>() as unknown as Repo['passkeys']

  private config: Config = { ...CONFIG_POR_DEFECTO }
  private archivos = new Map<string, { bytes: Uint8Array; tipo: string }>()

  /** Carga los datos iniciales (igual que el seed del SQL). */
  seed(): this {
    // Las tablas en memoria se llenan sincrónicamente: create() no espera nada real.
    for (const r of RECORDATORIOS_INICIALES) void this.recordatorios.create(r)
    for (const nombre of CARPETAS_INICIALES) void this.carpetas.create({ nombre })
    return this
  }

  /** Borra todo y deja la config por defecto. */
  vaciar(): void {
    for (const e of ENTIDADES) (this[e as Entidad] as unknown as TablaMemoria<never>).vaciar()
    this.config = { ...CONFIG_POR_DEFECTO }
    this.archivos.clear()
  }

  async getConfig(): Promise<Config> {
    return { ...this.config }
  }

  async setConfig(patch: Partial<Config>): Promise<Config> {
    this.config = { ...this.config, ...limpiar(patch) }
    return { ...this.config }
  }

  async uploadArchivo(path: string, blob: Blob): Promise<string> {
    validarPathArchivo(path)
    this.archivos.set(path, { bytes: new Uint8Array(await blob.arrayBuffer()), tipo: blob.type })
    return path
  }

  async urlArchivo(path: string): Promise<string> {
    return `/api/archivos/${path}`
  }

  /** Solo memoria: lo usa la ruta GET /api/archivos/[...path]. */
  async leerArchivo(path: string): Promise<{ bytes: Uint8Array; tipo: string } | null> {
    return this.archivos.get(path) ?? null
  }
}
