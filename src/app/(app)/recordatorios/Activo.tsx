'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Sheet, clasesFechaHora } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { OPCIONES_POSPONER } from '@/domain/posponer'

export interface ItemActivo { id: string; titulo: string; fecha: string; dias: number; posponerDias: number }

type Posponer = { dias: number } | { hasta: string }

/** "2026-12-20" -> "20 de diciembre" */
function diaLargo(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][m - 1]}`
}

/**
 * "Posponer": hoja chica para elegir cuánto, siempre de menor a mayor: 1 día · 3 días · 1 semana · 15 días · 1 mes ·
 * Elegir fecha. La opción por defecto del recordatorio aparece marcada en su lugar (ronda 5).
 */
function HojaPosponer({ item, onCerrar, onElegir }: { item: ItemActivo | null; onCerrar: () => void; onElegir: (p: Posponer) => void }) {
  const [eleccion, setEleccion] = useState<string>('')
  const [fecha, setFecha] = useState('')
  const actual = eleccion || String(item?.posponerDias ?? 15)
  return (
    <Sheet abierto={item !== null} onCerrar={() => { setEleccion(''); onCerrar() }} titulo={`Posponer ${item?.titulo ?? ''}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          onElegir(actual === 'fecha' ? { hasta: fecha } : { dias: Number(actual) })
          setEleccion('')
        }}
      >
        <div role="radiogroup" aria-label="¿Cuánto?" className="overflow-hidden rounded-2xl border border-borde">
          {[...OPCIONES_POSPONER.map(([d, t]) => [String(d), t] as const), ['fecha', 'Elegir fecha'] as const].map(([v, t]) => (
            <label key={v} className="flex min-h-12 cursor-pointer items-center gap-3 px-4 text-base [&:not(:first-child)]:border-t [&:not(:first-child)]:border-borde">
              <input type="radio" name="cuanto" value={v} checked={actual === v} onChange={() => setEleccion(v)} className="size-5 accent-azul" />
              {t}
            </label>
          ))}
        </div>
        {actual === 'fecha' && (
          <input type="date" aria-label="Hasta" value={fecha} onChange={(e) => setFecha(e.target.value)} className={clasesFechaHora} />
        )}
        <Boton type="submit" className="w-full" disabled={actual === 'fecha' && !fecha}>Posponer</Boton>
      </form>
    </Sheet>
  )
}

/** Tarjetas activas. El aviso de confirmación vive acá (no en la tarjeta) para sobrevivir al refresh del servidor. */
export default function ListaActivos({ items }: { items: ItemActivo[] }) {
  const router = useRouter()
  const [avisos, setAvisos] = useState<Array<{ id: string; msg: string }>>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [posponiendo, setPosponiendo] = useState<ItemActivo | null>(null)

  async function accion(id: string, a: 'posponer' | 'resolver', cuanto?: Posponer) {
    setEnviando(true)
    setError('')
    try {
      const res = await fetch(`/api/recordatorios/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: a, ...cuanto }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'No se pudo guardar. Probá de nuevo.')
        return
      }
      const msg = a === 'resolver'
        ? '¡Listo!'
        : cuanto && 'hasta' in cuanto
          ? `Te lo recuerdo de nuevo el ${diaLargo(cuanto.hasta)}.`
          : `Te lo recuerdo de nuevo en ${cuanto?.dias === 1 ? '1 día' : `${cuanto?.dias} días`}.`
      setAvisos((v) => [...v, { id, msg }])
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
            <Boton variante="blanco" className="whitespace-nowrap" disabled={enviando} onClick={() => setPosponiendo(r)}>Posponer</Boton>
            <Boton className="whitespace-nowrap" disabled={enviando} onClick={() => accion(r.id, 'resolver')}><Icono nombre="tilde" tamano={18} trazo={2.2} />Resuelto</Boton>
          </div>
        </div>
      ))}
      <HojaPosponer
        item={posponiendo}
        onCerrar={() => setPosponiendo(null)}
        onElegir={(p) => { const id = posponiendo!.id; setPosponiendo(null); void accion(id, 'posponer', p) }}
      />
    </div>
  )
}
