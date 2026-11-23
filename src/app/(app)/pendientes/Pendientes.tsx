'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, EmptyState, clasesInput } from '@/components/ui'
import { useTextoEscrito } from '@/components/useTextoEscrito'
import { agregarPendiente, tildarPendiente } from './actions'

export interface ItemPendiente { id: string; texto: string; hecho: boolean }

export default function Pendientes({ items }: { items: ItemPendiente[] }) {
  const router = useRouter()
  const [texto, setTexto, campo] = useTextoEscrito('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  // estado optimista por id: sobrevive hasta que llegan los datos nuevos del servidor
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  const lista = items.map((i) => ({ ...i, hecho: cambios[i.id] ?? i.hecho }))
  const abiertos = lista.filter((i) => !i.hecho)
  const hechos = lista.filter((i) => i.hecho)

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await agregarPendiente(texto)
      if (!r.ok) { setError(r.error); return }
      setTexto('')
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  async function tildar(id: string, hecho: boolean) {
    setCambios((c) => ({ ...c, [id]: hecho }))
    setError('')
    try {
      const r = await tildarPendiente(id, hecho)
      if (!r.ok) throw new Error(r.error)
      router.refresh()
    } catch {
      setCambios((c) => { const n = { ...c }; delete n[id]; return n })
      setError('No se pudo guardar. Probá de nuevo.')
    }
  }

  const fila = (i: ItemPendiente) => (
    <li key={i.id} className="flex min-h-11 items-center gap-3 rounded-2xl border border-borde bg-white px-3 py-1">
      <input
        type="checkbox" checked={i.hecho} onChange={(e) => tildar(i.id, e.target.checked)} aria-label={i.texto}
        className="h-11 w-11 shrink-0 accent-azul"
      />
      <span className={`text-base ${i.hecho ? 'text-texto-2 line-through' : ''}`}>{i.texto}</span>
    </li>
  )

  return (
    <div className="space-y-6">
      <form onSubmit={agregar} className="flex gap-2">
        <input
          {...campo} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Agregar pendiente" placeholder="Agregar pendiente"
          maxLength={200} autoComplete="off" enterKeyHint="done" className={clasesInput}
        />
        <Boton type="submit" disabled={enviando}>Agregar</Boton>
      </form>
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <section aria-labelledby="por-hacer" className="space-y-3">
        <h2 id="por-hacer" className="text-xl font-bold">Por hacer</h2>
        {abiertos.length === 0 && <EmptyState>No hay pendientes. Escribí uno arriba.</EmptyState>}
        <ul className="space-y-2">{abiertos.map(fila)}</ul>
      </section>
      {hechos.length > 0 && (
        <section aria-labelledby="hechos" className="space-y-3">
          <h2 id="hechos" className="text-xl font-bold">Hechos</h2>
          <ul className="space-y-2">{hechos.map(fila)}</ul>
        </section>
      )}
    </div>
  )
}
