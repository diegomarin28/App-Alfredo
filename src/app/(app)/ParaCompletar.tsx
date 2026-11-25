'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Field, Lista, Sheet, clasesInput, clasesSelect } from '@/components/ui'
import { VISIBLES_COMPLETAR, type ItemCompletar } from '@/domain/completar'
import { nombreCasa } from '@/domain/casas'
import { DiaMes } from './calendario/NuevaFecha'
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
  const [errorHoja, setErrorHoja] = useState('')
  const [enviando, setEnviando] = useState(false)

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

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editando) return
    const f = new FormData(e.currentTarget)
    const s = (k: string) => String(f.get(k) ?? '')
    setEnviando(true)
    setErrorHoja('')
    try {
      let r: Res
      if (editando.tipo === 'fecha') {
        const anio = s('anio').trim()
        r = await completarCumple(editando.id, { nombre: s('nombre'), dia: Number(s('dia') || NaN), mes: Number(s('mes') || NaN), anio: anio ? Number(anio) : null })
      } else if (editando.tipo === 'servicio') {
        r = await editarServicio(editando.id, { clave: s('clave'), valor: s('valor') })
      } else {
        r = await editarContacto(editando.id, { nombre: s('nombre'), grupoId: s('grupo'), empresa: s('empresa'), telefono: s('telefono'), nota: s('nota') })
      }
      if (!r.ok) { setErrorHoja(r.error); return }
      setEditando(null)
      router.refresh()
    } catch {
      setErrorHoja('No se pudo guardar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
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
                onClick={() => { setErrorHoja(''); setEditando(i) }}
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

      <Sheet abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando ? TITULO_HOJA[editando.tipo] : ''}>
        {editando && d && (
          <form key={editando.id} onSubmit={guardar} className="space-y-4" noValidate>
            {d.tipo === 'fecha' && (
              <>
                <Field label="Nombre"><input name="nombre" defaultValue={d.nombre} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
                <DiaMes />
                <Field label="Año de nacimiento (opcional)">
                  <input name="anio" defaultValue={d.anioNacimiento ?? ''} inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
                </Field>
              </>
            )}
            {d.tipo === 'servicio' && (
              <>
                <Field label="Servicio"><input name="clave" defaultValue={d.clave} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
                <Field label="Dato" hint="Por ejemplo Cliente 123456">
                  <input name="valor" defaultValue={d.valor ?? ''} maxLength={500} autoFocus className={clasesInput} autoComplete="off" />
                </Field>
              </>
            )}
            {d.tipo === 'contacto' && (
              <>
                <Field label="Nombre"><input name="nombre" defaultValue={d.nombre} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
                {grupos.length > 0 && (
                  <Field label="Grupo (opcional)">
                    <select name="grupo" defaultValue={d.grupoId ?? ''} className={clasesSelect}>
                      <option value="">Sin grupo</option>
                      {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Empresa"><input name="empresa" defaultValue={d.empresa ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
                <Field label="Teléfono" hint="Por ejemplo 099 123 456">
                  <input name="telefono" defaultValue={d.telefono ?? ''} type="tel" inputMode="tel" autoFocus className={clasesInput} autoComplete="off" />
                </Field>
                <Field label="Nota"><textarea name="nota" defaultValue={d.nota ?? ''} maxLength={2000} rows={3} className={`${clasesInput} py-3`} /></Field>
              </>
            )}
            {errorHoja && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{errorHoja}</p>}
            <Boton type="submit" disabled={enviando} className="w-full">Guardar</Boton>
          </form>
        )}
      </Sheet>
    </section>
  )
}
