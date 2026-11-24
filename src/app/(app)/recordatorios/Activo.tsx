'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton } from '@/components/ui'
import { Icono } from '@/components/iconos'

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
      {avisos.map((a) => <p key={a.id} role="status" className="rounded-2xl bg-tinte p-4 text-base font-semibold text-azul motion-safe:animate-entrar">{a.msg}</p>)}
      {items.filter((r) => !hechos.has(r.id)).map((r) => (
        <div key={r.id} role="article" aria-label={r.titulo} className="space-y-3 rounded-[20px] bg-tinte p-3.5">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-azul">
              <Icono nombre="campana" tamano={20} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-texto">{r.titulo}</h3>
              <p className={`text-base ${r.dias <= 7 ? 'text-urg-tx' : 'text-texto-2'}`}>
                {r.fecha} · {r.dias === 0 ? 'es hoy' : r.dias === 1 ? 'falta 1 día' : `faltan ${r.dias} días`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Boton variante="blanco" className="whitespace-nowrap" disabled={enviando} onClick={() => accion(r.id, 'posponer')}>Posponer 15 días</Boton>
            <Boton className="whitespace-nowrap" disabled={enviando} onClick={() => accion(r.id, 'resolver')}><Icono nombre="tilde" tamano={18} trazo={2.2} />Resuelto</Boton>
          </div>
        </div>
      ))}
    </div>
  )
}
