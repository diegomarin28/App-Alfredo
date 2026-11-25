import { normalizarBusqueda } from './contactos'

/** Ícono de un servicio de las casas, por su nombre (ronda 6). */
export type IconoServicio = 'rayo' | 'gota' | 'tele' | 'wifi' | 'escudo' | 'telefono' | 'herramienta'

const REGLAS: [RegExp, IconoServicio][] = [
  [/\bute\b|\bluz\b|electric/, 'rayo'],
  [/\bose\b|\bagua\b/, 'gota'],
  [/prosegur|alarma|segurid|vigilancia|\bcamaras?\b|\bsegur/, 'escudo'],
  [/internet|\bwi ?fi\b|\bfibra\b|\bantel\b|\brouter\b/, 'wifi'],
  [/directv|\btv\b|\btele\b|television|\bcable\b|netflix|\bflow\b/, 'tele'],
  [/telefono|celular|\bmovil\b/, 'telefono'],
]

/**
 * UTE → rayo, OSE → gota, DirecTV/TV → tele, internet → wifi, Prosegur/alarma/seguridad → escudo;
 * el resto, una herramienta.
 */
export function iconoServicio(clave: string): IconoServicio {
  const n = normalizarBusqueda(clave).replace(/[^a-z0-9]+/g, ' ')
  return REGLAS.find(([re]) => re.test(n))?.[1] ?? 'herramienta'
}
