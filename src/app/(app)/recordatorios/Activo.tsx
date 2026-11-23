'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Card } from '@/components/ui'

export interface ItemActivo { id: string; titulo: string; fecha: string; dias: number }

/** Tarjetas activas. El aviso de confirmación vive acá (no en la tarjeta) para sobrevivir al refresh del servidor. */
export default function ListaActivos({ items }: { items: ItemActivo[] }) {
  const router = useRouter()
  const [avisos, setAvisos] = useState<Array<{ id: string; msg: string }>>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function accion(id: string, a: 'posponer' | 'resolver') {
    setEnviando(true)
    setError('')
    try {
      const res = await fetch(`/api/recordatorios/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: a }),
      })
      if (!res.ok) { setError('No se pudo guardar. Probá de nuevo.'); return }
      setAvisos((v) => [...v, { id, msg: a === 'posponer' ? 'Te lo recuerdo de nuevo en 15 días.' : '¡Listo!' }])
      router.refresh()
    } catch {
      setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const hechos = new Set(avisos.map((a) => a.id))
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      {avisos.map((a) => <p key={a.id} role="status" className="rounded-2xl bg-tinte p-4 text-base font-medium">{a.msg}</p>)}
      {items.filter((r) => !hechos.has(r.id)).map((r) => (
        <Card key={r.id} role="article" aria-label={r.titulo} className="space-y-3">
          <div>
            <h3 className="text-xl font-semibold">{r.titulo}</h3>
            <p className="text-base text-texto-2">{r.fecha}</p>
            <p className="text-base font-medium">{r.dias === 0 ? 'Es hoy' : r.dias === 1 ? 'Falta 1 día' : `Faltan ${r.dias} días`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Boton variante="suave" disabled={enviando} onClick={() => accion(r.id, 'posponer')}>Posponer 15 días</Boton>
            <Boton disabled={enviando} onClick={() => accion(r.id, 'resolver')}>Resuelto</Boton>
          </div>
        </Card>
      ))}
    </div>
  )
}
