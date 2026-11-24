import { Barra, Esqueleto, Filas, Titulo } from '@/components/Esqueleto'

/** Calendario cargando: próximo cumpleaños con el saludo y la lista por mes. */
export default function Cargando() {
  return (
    <Esqueleto>
      <div className="flex items-center justify-between gap-3">
        <Titulo ancho="w-44" />
        <Barra className="h-11 w-28" />
      </div>
      <Barra className="h-64 w-full rounded-2xl" />
      <Barra className="h-6 w-28" />
      <Filas cantidad={3} alto="h-14" />
    </Esqueleto>
  )
}
