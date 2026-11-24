import type {
  Carpeta, ClaveCifrada, Config, Contacto, Documento, EventoCasa, Fecha,
  FotoFamiliar, GrupoContacto, Nota, Passkey, Pendiente, PersonaCasa, Recordatorio, ServicioCasa,
  Suscripcion, UsoIa, Vencimiento,
} from '@/domain/tipos'

/** Datos para crear: sin id; creadoEn lo pone el repo si falta. */
export type Nuevo<E extends { id: string }> = Omit<E, 'id' | 'creadoEn'> & { creadoEn?: string }

/** Campos que declaran `| null` como valor real (null se conserva, no borra). */
export const CONSERVAR_NULL: Partial<Record<Entidad, string[]>> = { recordatorios: ['dia'] }

/** Cambio parcial: `null` borra el campo (queda ausente al leer); `undefined` no lo toca. */
export type Cambio<E extends { id: string }> = { [K in keyof Omit<E, 'id'>]?: Omit<E, 'id'>[K] | null }

export interface Tabla<E extends { id: string }> {
  /** filtro: igualdad por campo. Orden: eventosCasa por `cuando` desc; el resto por creación. */
  list(filtro?: Partial<E>): Promise<E[]>
  get(id: string): Promise<E | null>
  create(data: Nuevo<E>): Promise<E>
  update(id: string, patch: Cambio<E>): Promise<E>
  /** Idempotente: borrar algo que no existe no falla. */
  remove(id: string): Promise<void>
}

export interface Repo {
  fechas: Tabla<Fecha>
  recordatorios: Tabla<Recordatorio>
  vencimientos: Tabla<Vencimiento>
  personasCasa: Tabla<PersonaCasa>
  eventosCasa: Tabla<EventoCasa>
  serviciosCasa: Tabla<ServicioCasa>
  contactos: Tabla<Contacto>
  gruposContacto: Tabla<GrupoContacto>
  pendientes: Tabla<Pendiente>
  notas: Tabla<Nota>
  carpetas: Tabla<Carpeta>
  documentos: Tabla<Documento>
  fotos: Tabla<FotoFamiliar>
  claves: Tabla<ClaveCifrada>
  usoIa: Tabla<UsoIa>
  passkeys: Tabla<Passkey>
  suscripciones: Tabla<Suscripcion>
  getConfig(): Promise<Config>
  setConfig(patch: Partial<Config>): Promise<Config>
  /** path debe empezar con `fotos/` o `documentos/`. Devuelve el path. */
  uploadArchivo(path: string, blob: Blob): Promise<string>
  urlArchivo(path: string): Promise<string>
  /** Borra el archivo guardado. Idempotente; valida el path igual que uploadArchivo. */
  removeArchivo(path: string): Promise<void>
}

export type Entidad = Exclude<keyof Repo, 'getConfig' | 'setConfig' | 'uploadArchivo' | 'urlArchivo' | 'removeArchivo'>

export const ENTIDADES: Entidad[] = [
  'fechas', 'recordatorios', 'vencimientos', 'personasCasa', 'eventosCasa',
  'serviciosCasa', 'contactos', 'gruposContacto', 'pendientes', 'notas', 'carpetas',
  'documentos', 'fotos', 'claves', 'usoIa', 'passkeys',
  'suscripciones',
]

/** Nombre de tabla en Postgres por entidad. */
export const TABLAS: Record<Entidad, string> = {
  fechas: 'fechas', recordatorios: 'recordatorios', vencimientos: 'vencimientos',
  personasCasa: 'personas_casa', eventosCasa: 'eventos_casa', serviciosCasa: 'servicios_casa',
  contactos: 'contactos', gruposContacto: 'grupos_contacto', pendientes: 'pendientes', notas: 'notas', carpetas: 'carpetas',
  documentos: 'documentos', fotos: 'fotos', claves: 'claves', usoIa: 'uso_ia',
  passkeys: 'passkeys', suscripciones: 'suscripciones',
}

export const CONFIG_POR_DEFECTO: Config = {
  nombre: 'Alfredo',
  estiloEscritura: '',
  alertaIaEnviada: false,
  bienvenidaVista: false,
}

export function validarPathArchivo(path: string): void {
  if (!/^(fotos|documentos)\/[^/].*$/.test(path) || path.includes('..')) {
    throw new Error(`Path de archivo inválido: ${path}`)
  }
}

export const RECORDATORIOS_INICIALES = [
  { titulo: 'Gestionar fin de año', dia: '12-31', avisarDiasAntes: 60 },
  { titulo: 'Gestionar Navidad', dia: '12-25', avisarDiasAntes: 60 },
  { titulo: 'Cena de Navidad', dia: '12-24', avisarDiasAntes: 30 },
  { titulo: 'Cena de Año Nuevo', dia: '12-31', avisarDiasAntes: 30 },
  { titulo: 'Cena de mi cumpleaños', dia: '11-25', avisarDiasAntes: 30 },
  { titulo: 'Sacar pasajes de los chicos', dia: null, avisarDiasAntes: 60 },
]

/** Las 6 carpetas sugeridas de arranque (igual que la migración 0004). */
export const CARPETAS_INICIALES: { nombre: string; descripcion: string; orden: number }[] = [
  { nombre: 'Personales', descripcion: 'Cédula, pasaporte, carné', orden: 1 },
  { nombre: 'Seguros', descripcion: 'Auto, casas, vida', orden: 2 },
  { nombre: 'Escrituras', descripcion: 'Portofino, Malibú', orden: 3 },
  { nombre: 'Autos', descripcion: 'Libretas, patentes', orden: 4 },
  { nombre: 'Empresa', descripcion: 'SIE: contratos, BPS', orden: 5 },
  { nombre: 'Salud', descripcion: 'Carné, estudios', orden: 6 },
]
