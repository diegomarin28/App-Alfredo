import { Barra, EsqueletoPagina } from '@/components/Esqueleto'

/** Pendientes y notas cargando. */
export default function Cargando() {
  return <EsqueletoPagina filas={4} alto="h-12" arriba={<Barra className="h-11 w-full" />} />
}
