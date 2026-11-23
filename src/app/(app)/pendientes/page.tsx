import { getRepo } from '@/data/getRepo'
import { fechaCorta } from '@/domain/vencimientos'
import { Card, EmptyState } from '@/components/ui'
import NuevaNota from './NuevaNota'
import Pendientes from './Pendientes'

export const dynamic = 'force-dynamic'

export default async function PendientesYNotas() {
  const repo = await getRepo()
  const pendientes = await repo.pendientes.list()
  const notas = (await repo.notas.list()).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

  return (
    <main className="space-y-8">
      <h1 className="text-[28px] leading-tight font-semibold text-texto">Pendientes y notas</h1>
      <Pendientes items={pendientes.map((p) => ({ id: p.id, texto: p.texto, hecho: p.hecho }))} />
      <section aria-labelledby="notas" className="space-y-3">
        <h2 id="notas" className="text-xl font-semibold">Notas</h2>
        <NuevaNota />
        {notas.length === 0 && <EmptyState>Todavía no hay notas.</EmptyState>}
        <ul className="space-y-2">
          {notas.map((n) => (
            <li key={n.id}>
              <Card className="space-y-1">
                <p className="text-base text-texto-2">{n.origen === 'voz' ? 'Nota de voz' : 'Escrita'} · {fechaCorta(n.creadoEn)}</p>
                <p className="text-base whitespace-pre-wrap">{n.texto}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
