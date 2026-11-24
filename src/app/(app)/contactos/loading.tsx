import { Barra, EsqueletoPagina } from '@/components/Esqueleto'

/** Contactos cargando: buscador, filtros y la lista. */
export default function Cargando() {
  return <EsqueletoPagina filas={4} alto="h-24" arriba={<Barra className="h-11 w-full" />} />
}
