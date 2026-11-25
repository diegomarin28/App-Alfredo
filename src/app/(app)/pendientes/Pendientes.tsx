'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Field, Lista, Sheet, clasesFechaHora, clasesInput, clasesSeparador } from '@/components/ui'
import { Flor, Flotante, Golf } from '@/components/detalles'
import { contarTildado, tocaFlor, type CuentaDelDia } from '@/domain/detalles'
import { Circulo } from '@/components/controles'
import { Icono } from '@/components/iconos'
import { TocarParaEditar } from '@/components/Editar'
import { diaCorto } from '@/domain/fechaTexto'
import { agregarPendiente, editarPendiente, tildarPendiente } from './actions'

export interface ItemPendiente { id: string; texto: string; hecho: boolean; deVoz: boolean; fecha?: string }

/** Ronda 7: la fecha de una tarea, aparte del texto y opcional. */
function CampoFechaTarea({ valor, onCambio }: { valor?: string; onCambio?: (v: string) => void }) {
  return (
    <Field label="Para cuándo (opcional)">
      {onCambio
        ? <input type="date" value={valor ?? ''} onChange={(e) => onCambio(e.target.value)} className={clasesFechaHora} />
        : <input type="date" name="fecha" defaultValue={valor ?? ''} className={clasesFechaHora} />}
    </Field>
  )
}

/** Lo que dura el rebote del círculo antes de mover la fila (220 ms + un poco). */
const REBOTE_MS = 250

/** El "+" del título: abre la hoja para escribir un pendiente nuevo. */
export function NuevoPendiente() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await agregarPendiente(texto, fecha)
      if (!r.ok) { setError(r.error); return }
      setTexto('')
      setFecha('')
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
      <BotonMas nombre="Agregar tarea" onClick={() => { setError(''); setAbierto(true) }} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nueva tarea">
        <form onSubmit={agregar} className="space-y-4">
          <input
            value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Qué hay que hacer" placeholder="Por ejemplo: llamar al contador"
            maxLength={200} autoComplete="off" enterKeyHint="done" autoFocus className={clasesInput}
          />
          <CampoFechaTarea valor={fecha} onCambio={setFecha} />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
        </form>
      </Sheet>
    </>
  )
}

/** Cuánto queda a la vista la Flor (~1,6 s de animación y un respiro). */
const FLOR_MS = 2600
const CLAVE_CUENTA = 'alfredo:tildados-del-dia'

/** La cuenta del día vive en el teléfono (localStorage); sin acceso (modo privado), la Flor no sale. */
function leerCuenta(): CuentaDelDia | null {
  try { return JSON.parse(localStorage.getItem(CLAVE_CUENTA) ?? 'null') as CuentaDelDia | null } catch { return null }
}
function guardarCuenta(c: CuentaDelDia) {
  try { localStorage.setItem(CLAVE_CUENTA, JSON.stringify(c)) } catch { /* sin almacenamiento: no pasa nada */ }
}

/**
 * Lista de pendientes (mockup v2): una tarjeta con círculos para tildar; los hechos, plegados abajo.
 * Detalles: al tildar el tercero del día, ¡Flor! (truco); al tildar el último, la pelota entra al hoyo (golf).
 */
export default function Pendientes({ items, nombre, hoy }: { items: ItemPendiente[]; nombre: string; hoy: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  // estado optimista por id: sobrevive hasta que llegan los datos nuevos del servidor
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  // recién tocados: el círculo se llena (con su rebote) en su lugar y la fila se mueve después
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const lista = items.map((i) => ({ ...i, hecho: cambios[i.id] ?? i.hecho }))
  const abiertos = lista.filter((i) => !i.hecho)
  const hechos = lista.filter((i) => i.hecho)
  const [flor, setFlor] = useState(false)
  // el golf se anima solo cuando el último se tilda acá (si no, el hoyo quieto). Si coincide con la Flor, el golf
  // ("Todo al día") no se muestra detrás de ella: aparece cuando la Flor se va.
  const [golf, setGolf] = useState<{ esperaMs: number } | null>(null)

  async function tildar(id: string, hecho: boolean) {
    setTocados((t) => ({ ...t, [id]: hecho }))
    if (hecho) {
      const cuenta = contarTildado(leerCuenta(), hoy)
      const conFlor = tocaFlor(cuenta)
      guardarCuenta(conFlor ? { ...cuenta, flor: true } : cuenta)
      if (conFlor) {
        setFlor(true)
        setTimeout(() => setFlor(false), FLOR_MS)
      }
      const quedan = abiertos.filter((i) => i.id !== id && !tocados[i.id]).length
      if (quedan === 0) setGolf({ esperaMs: 0 })
    } else {
      setGolf(null)
    }
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
      {/* ronda 6: tocar el texto abre la edición */}
      <TocarParaEditar
        etiqueta={`Editar ${i.texto}`} titulo="Editar tarea" guardar={(f) => editarPendiente(i.id, f)} className="flex min-h-12 items-center gap-1.5"
        campos={<>
          <input name="texto" defaultValue={i.texto} aria-label="Qué hay que hacer" maxLength={200} autoComplete="off" enterKeyHint="done" autoFocus className={clasesInput} />
          <CampoFechaTarea valor={i.fecha} />
        </>}
      >
        <span className="min-w-0 flex-1">
          <span className={`block text-base ${i.hecho ? 'text-texto-2 line-through' : 'text-texto'}`}>{i.texto}</span>
          {i.fecha && <span className="block text-base text-texto-2">{diaCorto(i.fecha)}</span>}
        </span>
        {i.deVoz && <span title="Lo dictaste en Contame" className="text-texto-2"><Icono nombre="microfono" tamano={18} /></span>}
      </TocarParaEditar>
    </li>
  )

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      {flor && <Flotante><Flor /></Flotante>}
      <section aria-label="Por hacer">
        {abiertos.length === 0
          ? flor
            ? <div data-esperando-flor className="min-h-[230px]" />
            : <Golf nombre={nombre} animar={golf !== null} esperaMs={golf?.esperaMs ?? 0} />
          : <Lista>{abiertos.map(fila)}</Lista>}
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
