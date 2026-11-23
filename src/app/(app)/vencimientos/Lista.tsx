'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Card } from '@/components/ui'
import { deshacerHecho, marcarHecho } from './actions'

export interface Item { id: string; titulo: string; fecha: string; chip: string; urgente: boolean }

/** Cuánto queda a la vista el "Deshacer" después de tocar Hecho. */
export const DESHACER_MS = 10_000

export default function Lista({ items }: { items: Item[] }) {
  const router = useRouter()
  // Recién marcados: se muestran como "Marcado como hecho" con Deshacer hasta que vence el plazo.
  const [hechos, setHechos] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const t = timers.current
    return () => { for (const id of t.values()) clearTimeout(id) }
  }, [])

  function olvidar(id: string) {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setHechos((h) => h.filter((x) => x.id !== id))
  }

  async function hecho(item: Item) {
    setEnviando(true)
    setError('')
    try {
      const r = await marcarHecho(item.id)
      if (!r.ok) { setError(r.error); return }
      setHechos((h) => [...h.filter((x) => x.id !== item.id), item])
      timers.current.set(item.id, setTimeout(() => olvidar(item.id), DESHACER_MS))
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function deshacer(item: Item) {
    setEnviando(true)
    setError('')
    try {
      const r = await deshacerHecho(item.id)
      if (!r.ok) { setError(r.error); return }
      olvidar(item.id)
      router.refresh()
    } catch {
      setError('No se pudo deshacer. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const marcados = new Set(hechos.map((h) => h.id))
  return (
    <>
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <ul className="space-y-2">
        {hechos.map((i) => (
          <li key={`hecho-${i.id}`}>
            <Card role="status" className="flex items-center justify-between gap-3 bg-tinte">
              <div className="min-w-0">
                <p className="text-base font-medium">Marcado como hecho</p>
                <p className="text-base text-texto-2">{i.titulo}</p>
              </div>
              <Boton disabled={enviando} onClick={() => deshacer(i)} className="shrink-0">Deshacer</Boton>
            </Card>
          </li>
        ))}
        {items.filter((i) => !marcados.has(i.id)).map((i) => (
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
              <Boton variante="suave" disabled={enviando} onClick={() => hecho(i)}>Hecho</Boton>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
