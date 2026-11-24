'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, EmptyState, Lista, Sheet, clasesInput, clasesSeparador } from '@/components/ui'
import { Circulo } from '@/components/controles'
import { Icono } from '@/components/iconos'
import { agregarPendiente, tildarPendiente } from './actions'

export interface ItemPendiente { id: string; texto: string; hecho: boolean; deVoz: boolean }

/** Lo que dura el rebote del círculo antes de mover la fila (220 ms + un poco). */
const REBOTE_MS = 250

/** El "+" del título: abre la hoja para escribir un pendiente nuevo. */
export function NuevoPendiente() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await agregarPendiente(texto)
      if (!r.ok) { setError(r.error); return }
      setTexto('')
      setAbierto(false)
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <BotonMas nombre="Agregar pendiente" onClick={() => { setError(''); setAbierto(true) }} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo pendiente">
        <form onSubmit={agregar} className="space-y-4">
          <input
            value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Qué hay que hacer" placeholder="Por ejemplo: llamar al contador"
            maxLength={200} autoComplete="off" enterKeyHint="done" autoFocus className={clasesInput}
          />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}

/** Lista de pendientes (mockup v2): una tarjeta con círculos para tildar; los hechos, plegados abajo. */
export default function Pendientes({ items }: { items: ItemPendiente[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  // estado optimista por id: sobrevive hasta que llegan los datos nuevos del servidor
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  // recién tocados: el círculo se llena (con su rebote) en su lugar y la fila se mueve después
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const lista = items.map((i) => ({ ...i, hecho: cambios[i.id] ?? i.hecho }))
  const abiertos = lista.filter((i) => !i.hecho)
  const hechos = lista.filter((i) => i.hecho)

  async function tildar(id: string, hecho: boolean) {
    setTocados((t) => ({ ...t, [id]: hecho }))
    setError('')
    const guardado = tildarPendiente(id, hecho)
    await new Promise((r) => setTimeout(r, REBOTE_MS))
    setCambios((c) => ({ ...c, [id]: hecho }))
    setTocados((t) => { const n = { ...t }; delete n[id]; return n })
    try {
      const r = await guardado
      if (!r.ok) throw new Error(r.error)
      router.refresh()
    } catch {
      setCambios((c) => { const n = { ...c }; delete n[id]; return n })
      setError('No se pudo guardar. Probá de nuevo.')
    }
  }

  const fila = (i: ItemPendiente) => (
    <li key={i.id} data-fila className={`flex min-h-14 items-center gap-1.5 py-1 pr-4 pl-2 ${clasesSeparador}`}>
      <Circulo marcado={tocados[i.id] ?? i.hecho} nombre={i.texto} onCambio={(v) => tildar(i.id, v)} />
      <span className={`flex-1 text-base ${i.hecho ? 'text-texto-2 line-through' : 'text-texto'}`}>{i.texto}</span>
      {i.deVoz && <span title="Lo dictaste en Contame" className="text-texto-2"><Icono nombre="microfono" tamano={18} /></span>}
    </li>
  )

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <section aria-label="Por hacer">
        {abiertos.length === 0 ? <EmptyState>No hay pendientes. Tocá el + para sumar uno.</EmptyState> : <Lista>{abiertos.map(fila)}</Lista>}
      </section>
      {hechos.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 text-base font-semibold text-texto-2 [&::-webkit-details-marker]:hidden">
            <Icono nombre="flecha" tamano={16} trazo={2} className="transition-transform group-open:rotate-90" />
            Hechos ({hechos.length})
          </summary>
          <section aria-label="Hechos" className="mt-2"><Lista>{hechos.map(fila)}</Lista></section>
        </details>
      )}
    </div>
  )
}
