'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Pill } from '@/components/ui'
import { Circulo } from '@/components/controles'
import { deshacerHecho, marcarHecho } from './actions'
import FormVencimiento, { type InicialVencimiento } from './FormVencimiento'

export interface Item {
  id: string; titulo: string; fecha: string; chip: string; tono: 'rojo' | 'naranja' | 'gris'
  /** para la hoja de editar (ronda 6) */
  editar: InicialVencimiento
}

/** Cuánto queda a la vista el "Deshacer" después de tocar Hecho. */
export const DESHACER_MS = 10_000

export default function Lista({ items }: { items: Item[] }) {
  const router = useRouter()
  // Recién marcados: se muestran como "Marcado como hecho" con Deshacer hasta que vence el plazo.
  const [hechos, setHechos] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  // el círculo se llena (con su rebote) apenas se toca, mientras se guarda
  const [marcando, setMarcando] = useState<string | null>(null)
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
    setMarcando(item.id)
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
      setMarcando(null)
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
      <ul className="space-y-2.5">
        {hechos.map((i) => (
          <li key={`hecho-${i.id}`} role="status" className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-tinte px-4 py-2.5 motion-safe:animate-entrar">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-azul">Marcado como hecho</p>
              <p className="text-base text-texto-2">{i.titulo}</p>
            </div>
            <Boton variante="blanco" disabled={enviando} onClick={() => deshacer(i)} className="shrink-0">Deshacer</Boton>
          </li>
        ))}
        {items.filter((i) => !marcados.has(i.id)).map((i) => (
          <li key={i.id} data-fila className="flex items-center gap-2 rounded-2xl border border-borde bg-white py-3 pr-4 pl-2">
            <Circulo marcado={marcando === i.id} nombre={`Marcar ${i.titulo} como hecho`} disabled={enviando} onCambio={() => hecho(i)} />
            {/* ronda 6: tocar la fila abre la edición */}
            <FormVencimiento inicial={i.editar} className="space-y-1">
              <span className="block text-base font-semibold text-texto">{i.titulo}</span>
              <span className="block text-base text-texto-2">{i.fecha}</span>
              <Pill tono={i.tono}>{i.chip}</Pill>
            </FormVencimiento>
          </li>
        ))}
      </ul>
    </>
  )
}
