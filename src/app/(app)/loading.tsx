import { Barra, Esqueleto, Filas, Titulo } from '@/components/Esqueleto'

/** Inicio cargando: fecha y saludo, foto del día, accesos y "Lo próximo". */
export default function Cargando() {
  return (
    <Esqueleto>
      <div className="space-y-2">
        <Barra className="h-5 w-44" />
        <Titulo ancho="w-64" />
      </div>
      <Barra className="aspect-[4/3] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => <Barra key={i} className="h-14 w-full rounded-[14px]" />)}
      </div>
      <Barra className="h-6 w-32" />
      <Filas cantidad={3} alto="h-14" />
    </Esqueleto>
  )
}
