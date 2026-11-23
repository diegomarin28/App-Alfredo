'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Card } from '@/components/ui'
import { marcarHecho } from './actions'

export interface Item { id: string; titulo: string; fecha: string; chip: string; urgente: boolean }

export default function Lista({ items }: { items: Item[] }) {
  const router = useRouter()
  const [ocultos, setOcultos] = useState<string[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function hecho(id: string) {
    setEnviando(true)
    setError('')
    try {
      const r = await marcarHecho(id)
      if (!r.ok) { setError(r.error); return }
      setOcultos((o) => [...o, id])
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <ul className="space-y-2">
        {items.filter((i) => !ocultos.includes(i.id)).map((i) => (
          <li key={i.id}>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-base font-medium">{i.titulo}</p>
                <p className="text-base text-texto-2">{i.fecha}</p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-base ${i.urgente ? 'bg-urg-bg text-urg-tx' : 'bg-gris'}`}>{i.chip}</span>
                  {i.urgente && <span className="text-base font-semibold text-urg-tx">Urgente</span>}
                </p>
              </div>
              <Boton variante="suave" disabled={enviando} onClick={() => hecho(i.id)}>Hecho</Boton>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
