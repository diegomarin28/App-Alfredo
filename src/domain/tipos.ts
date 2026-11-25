export interface Fecha {
  id: string
  /** lote de Contame que lo creó (para deshacer) */
  loteId?: string
  creadoEn?: string
  nombre: string
  /** los aniversarios viejos pasaron a "otra" (todos los años) en la migración 0005 */
  tipo: 'cumple' | 'otra'
  /** MM-DD; null = cumpleaños sin fecha todavía (va a "Para completar", no al Calendario) */
  dia: string | null
  anioNacimiento?: number
  /** solo "otra": cómo se repite (falta = todos los años). El cumpleaños es siempre todos los años. */
  repeticion?: Repeticion
  /** solo "otra": año de la fecha (desde cuándo, o el único si no se repite) */
  anioEvento?: number
  /** HH:MM, opcional */
  hora?: string
  /** solo "otra" semanal: días marcados, 1 = lunes … 7 = domingo (falta = el día de la semana de la fecha) */
  diasSemana?: number[]
  /** "Omitir" en "Para completar": no se pide más la fecha */
  completarOmitido?: boolean
}

export type Repeticion = 'nunca' | 'diaria' | 'semanal' | 'mensual' | 'anual'

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
  /** cómo se repite (falta = todos los años) */
  repeticion?: Repeticion
  /** año de la fecha (desde cuándo, o el único si no se repite) */
  anio?: number
  /** "Posponer" por defecto, en días (falta = 15) */
  posponerDias?: number
  /** semanal: días marcados, 1 = lunes … 7 = domingo (falta = el día de la semana de la fecha) */
  diasSemana?: number[]
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
  /** null = falta el número (va a "Para completar") */
  valor: string | null
  /** "Omitir" en "Para completar": no se pide más el número */
  completarOmitido?: boolean
}

export interface Contacto {
  id: string
  loteId?: string
  creadoEn?: string
  nombre: string
  /** grupo que creó Alfredo (Obra, Familia…); sin grupo si falta */
  grupoId?: string
  empresa?: string
  telefono?: string
  nota?: string
  /** "Omitir" en "Para completar": no se pide más el teléfono */
  completarOmitido?: boolean
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

export interface GrupoContacto {
  id: string
  creadoEn?: string
  nombre: string
  /** orden de los botones de filtro (menor primero) */
  orden: number
}

export interface Carpeta {
  id: string
  creadoEn?: string
  nombre: string
  /** qué va adentro, p. ej. "Cédula, pasaporte, carné" */
  descripcion?: string
  /** orden en la grilla (menor primero; las nuevas van al final) */
  orden?: number
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
  /** encuadre en el marco 16:9 de Inicio (object-position), 0..1 desde la izquierda y desde arriba; falta = 0.5 */
  focoX?: number
  focoY?: number
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

/** Suscripción Web Push del iPhone (una por endpoint). */
export interface Suscripcion {
  id: string
  creadoEn?: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface Config {
  estiloEscritura: string
  nombre: string
  alertaIaEnviada: boolean
  /** ya vio la Bienvenida y la Guía de la primera vez */
  bienvenidaVista: boolean
  claveSalt?: string
  claveModo?: 'prf' | 'pin'
  claveCheck?: string
  claveCheckIv?: string
}
