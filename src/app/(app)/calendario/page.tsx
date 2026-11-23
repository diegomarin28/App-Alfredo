import Link from 'next/link'
import { getRepo } from '@/data/getRepo'
import { hoy, proximosCumples } from '@/domain/fechas'
import { MESES } from '@/domain/validarFecha'
import { Card, EmptyState } from '@/components/ui'
import Saludo from './Saludo'
import NuevaFecha from './NuevaFecha'

export const dynamic = 'force-dynamic'

const TIPO = { cumple: 'Cumpleaños', aniversario: 'Aniversario', otra: 'Otra' } as const

function cuando(n: number): string {
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`
}

export default async function Calendario() {
  const hoyStr = hoy()
  const fechas = await (await getRepo()).fechas.list()
  const proximo = proximosCumples(fechas.filter((f) => f.tipo === 'cumple'), hoyStr)[0]
  const todas = proximosCumples(fechas, hoyStr)
  const mesActual = Number(hoyStr.slice(5, 7))

  const grupos = new Map<number, typeof todas>()
  for (const f of todas) {
    const m = Number(f.dia.slice(0, 2))
    grupos.set(m, [...(grupos.get(m) ?? []), f])
  }
  const ordenados = [...grupos.entries()]
    .sort(([a], [b]) => ((a - mesActual + 12) % 12) - ((b - mesActual + 12) % 12))
    .map(([m, items]) => [m, items.sort((a, b) => a.dia.localeCompare(b.dia) || a.nombre.localeCompare(b.nombre))] as const)

  return (
    <main className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold text-texto">Calendario</h1>
        <NuevaFecha />
      </header>

      {proximo && (
        <section aria-label="Próximo cumpleaños" className="space-y-3">
          <Card className="bg-tinte">
            <p className="text-xl font-semibold">
              {proximo.edad != null ? `${proximo.nombre} cumple ${proximo.edad}` : `Cumple de ${proximo.nombre}`}
            </p>
            <p className="mt-1 text-base text-texto-2">{cuando(proximo.dias)}</p>
          </Card>
          <h2 className="text-xl font-semibold">Saludo</h2>
          <Saludo key={proximo.id} nombre={proximo.nombre.trim().split(/\s+/)[0]} />
        </section>
      )}

      <Link href="/recordatorios" className="flex min-h-14 items-center rounded-2xl border border-borde bg-white px-4 text-base font-medium text-texto hover:bg-tinte">
        Recordatorios del año
      </Link>

      <section aria-labelledby="fechas" className="space-y-4">
        <h2 id="fechas" className="text-xl font-semibold">Fechas</h2>
        {ordenados.length === 0 && <EmptyState>Todavía no hay fechas cargadas. Tocá Agregar fecha para sumar la primera.</EmptyState>}
        {ordenados.map(([m, items]) => (
          <section key={m} aria-label={MESES[m - 1]} className="space-y-2">
            <h3 className="text-base font-semibold text-texto-2">{MESES[m - 1]}</h3>
            {items.map((f) => (
              <Card key={f.id} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-base font-medium">{f.nombre}</p>
                  <p className="text-base text-texto-2">
                    {TIPO[f.tipo]}{f.edad != null && f.tipo === 'cumple' ? ` · cumple ${f.edad} años` : f.edad != null ? ` · ${f.edad} años` : ''}
                  </p>
                </div>
                <span className="text-xl font-semibold">{Number(f.dia.slice(3))}</span>
              </Card>
            ))}
          </section>
        ))}
      </section>
    </main>
  )
}
