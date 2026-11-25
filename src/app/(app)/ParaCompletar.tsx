'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Lista } from '@/components/ui'
import { HojaEditar } from '@/components/Editar'
import { CamposContacto, CamposCumple, CamposServicio, entradaContacto } from '@/components/campos'
import { VISIBLES_COMPLETAR, type ItemCompletar } from '@/domain/completar'
import { nombreCasa } from '@/domain/casas'
import { completarCumple, editarContacto, editarServicio, omitirCompletar } from './completar'

/** Lo que necesita el formulario de edición de cada ítem. */
export type DatosCompletar =
  | { tipo: 'fecha'; nombre: string; anioNacimiento?: number }
  | { tipo: 'servicio'; clave: string; valor: string | null }
  | { tipo: 'contacto'; nombre: string; grupoId?: string; empresa?: string; telefono?: string; nota?: string }

export type FilaCompletar = ItemCompletar & { datos: DatosCompletar }

type Res = { ok: true } | { ok: false; error: string }

const TITULO_HOJA = { fecha: 'Fecha del cumpleaños', servicio: 'Editar servicio', contacto: 'Editar contacto' } as const

/**
 * "Para completar" (ronda 5, punto 9): debajo de "Lo próximo", solo si hay algo a medias. Cada fila con "Agregar"
 * (abre el formulario de edición de ese ítem) y "Omitir" (lo saca de la lista para siempre, sin borrarlo). Se ven
 * 3; el resto con "Ver todo".
 */
export default function ParaCompletar({ items, grupos }: { items: FilaCompletar[]; grupos: { id: string; nombre: string }[] }) {
  const router = useRouter()
  const [omitidos, setOmitidos] = useState<Set<string>>(new Set())
  const [todos, setTodos] = useState(false)
  const [editando, setEditando] = useState<FilaCompletar | null>(null)
  const [error, setError] = useState('')

  const quedan = items.filter((i) => !omitidos.has(i.id))
  if (quedan.length === 0) return null
  const visibles = todos ? quedan : quedan.slice(0, VISIBLES_COMPLETAR)

  async function omitir(i: FilaCompletar) {
    setError('')
    setOmitidos((o) => new Set(o).add(i.id))
    const r = await omitirCompletar(i.tipo, i.id).catch((): Res => ({ ok: false, error: 'No se pudo guardar. Probá de nuevo.' }))
    if (!r.ok) {
      setOmitidos((o) => { const n = new Set(o); n.delete(i.id); return n })
      setError(r.error)
      return
    }
    router.refresh()
  }

  /** Lo mismo que las hojas de editar de cada lista (ronda 6), con las acciones de "Para completar". */
  async function guardar(f: FormData): Promise<Res> {
    if (!editando) return { ok: true }
    const s = (k: string) => String(f.get(k) ?? '')
    if (editando.tipo === 'fecha') {
      const anio = s('anio').trim()
      return completarCumple(editando.id, { nombre: s('nombre'), dia: Number(s('dia') || NaN), mes: Number(s('mes') || NaN), anio: anio ? Number(anio) : null })
    }
    if (editando.tipo === 'servicio') return editarServicio(editando.id, { clave: s('clave'), valor: s('valor') })
    return editarContacto(editando.id, entradaContacto(f))
  }

  const d = editando?.datos
  return (
    <section aria-labelledby="completar" className="space-y-2.5">
      <h2 id="completar" className="text-[17px] font-bold">Para completar</h2>
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <Lista>
        {visibles.map((i) => (
          <li key={i.id} data-fila className="space-y-2 border-borde px-4 py-3 [&:not(:first-child)]:border-t">
            <div>
              <p className="text-base font-semibold text-texto">{i.titulo}</p>
              <p className="text-base text-texto-2">{i.casa ? `${nombreCasa(i.casa)} · ${i.falta}` : i.falta.charAt(0).toUpperCase() + i.falta.slice(1)}</p>
            </div>
            <div className="flex gap-2">
              <Boton
                variante="suave" aria-label={`Agregar: ${i.titulo}`} className="min-h-11 px-4"
                onClick={() => setEditando(i)}
              >
                Agregar
              </Boton>
              <button
                type="button" aria-label={`Omitir: ${i.titulo}`} onClick={() => void omitir(i)}
                className="min-h-11 rounded-xl px-3 text-base font-semibold text-texto-2"
              >
                Omitir
              </button>
            </div>
          </li>
        ))}
      </Lista>
      {quedan.length > VISIBLES_COMPLETAR && (
        <button type="button" onClick={() => setTodos((t) => !t)} className="-ml-2 min-h-11 rounded-xl px-2 text-base font-semibold text-azul">
          {todos ? 'Ver menos' : `Ver todo (${quedan.length})`}
        </button>
      )}

      <HojaEditar abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando ? TITULO_HOJA[editando.tipo] : ''} guardar={guardar}>
        {d?.tipo === 'fecha' && <CamposCumple nombre={d.nombre} anio={d.anioNacimiento} />}
        {d?.tipo === 'servicio' && <CamposServicio clave={d.clave} valor={d.valor} enfocarDato />}
        {d?.tipo === 'contacto' && <CamposContacto c={d} grupos={grupos} enfocarTelefono />}
      </HojaEditar>
    </section>
  )
}
