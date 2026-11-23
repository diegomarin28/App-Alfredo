export interface Fecha {
  id: string
  /** lote de Contame que lo creó (para deshacer) */
  loteId?: string
  creadoEn?: string
  nombre: string
  tipo: 'cumple' | 'aniversario' | 'otra'
  /** MM-DD */
  dia: string
  anioNacimiento?: number
}

export interface Recordatorio {
  id: string
  /** lote de Contame que lo creó (para deshacer) */
  loteId?: string
  creadoEn?: string
  titulo: string
  /** MM-DD; null = fecha todavía no cargada, nunca activo */
  dia: string | null
  avisarDiasAntes: number
  /** YYYY-MM-DD */
  pospuestoHasta?: string
  resueltoAnio?: number
}

export interface Vencimiento {
  id: string
  /** lote de Contame que lo creó (para deshacer) */
  loteId?: string
  creadoEn?: string
  titulo: string
  ambito: 'empresa' | 'personal'
  /** YYYY-MM-DD */
  fecha: string
  avisarDiasAntes: number
  hecho: boolean
}

export type Casa = 'portofino' | 'malibu'

export interface PersonaCasa {
  id: string
  loteId?: string
  creadoEn?: string
  casa: Casa
  nombre: string
  rol: string
  detalle?: string
  telefono?: string
}

export interface EventoCasa {
  id: string
  loteId?: string
  casa: Casa
  que: string
  /** YYYY-MM-DD */
  cuando: string
  creadoEn: string
}

export interface ServicioCasa {
  id: string
  loteId?: string
  creadoEn?: string
  casa: Casa
  clave: string
  valor: string
}

export interface Contacto {
  id: string
  loteId?: string
  creadoEn?: string
  nombre: string
  tipo: 'cliente' | 'proveedor' | 'otro'
  empresa?: string
  telefono?: string
  nota?: string
}

export interface Pendiente {
  id: string
  loteId?: string
  texto: string
  hecho: boolean
  creadoEn: string
}

export interface Nota {
  id: string
  loteId?: string
  texto: string
  origen: 'voz' | 'escrita'
  creadoEn: string
}

export interface Carpeta {
  id: string
  creadoEn?: string
  nombre: string
}

export interface Documento {
  id: string
  carpetaId: string
  titulo: string
  /** ruta en el bucket, empieza con documentos/ */
  path: string
  creadoEn: string
}

export interface FotoFamiliar {
  id: string
  creadoEn?: string
  /** ruta en el bucket, empieza con fotos/ */
  path: string
}

export interface ClaveCifrada {
  id: string
  creadoEn?: string
  sitio: string
  usuario?: string
  /** base64, AES-GCM */
  cifrado: string
  /** base64, 12 bytes */
  iv: string
}

export interface UsoIa {
  id: string
  tokensIn: number
  tokensOut: number
  costoUsd: number
  creadoEn: string
}

/** Passkey (Face ID) registrada para entrar. */
export interface Passkey {
  id: string
  creadoEn?: string
  /** base64url */
  credentialId: string
  /** clave pública COSE, base64url */
  publicKey: string
  counter: number
  transports?: string[]
}

export interface Config {
  estiloEscritura: string
  nombre: string
  alertaIaEnviada: boolean
  claveSalt?: string
  claveModo?: 'prf' | 'pin'
  claveCheck?: string
  claveCheckIv?: string
}
