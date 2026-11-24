'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, Boton, BotonIcono, Chip, EmptyState, Lista, Sheet, clasesFila, clasesInput } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { useTextoEscrito } from '@/components/useTextoEscrito'
import { coincide } from '@/domain/contactos'
import type { Contacto } from '@/domain/tipos'
import { crearGrupo } from './actions'

export interface Grupo { id: string; nombre: string }

/** "+ Grupo": crea un grupo nuevo (lo nombra Alfredo). */
function NuevoGrupo() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const r = await crearGrupo(nombre)
      if (!r.ok) { setError(r.error); return }
      setNombre('')
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
      <button
        type="button" onClick={() => { setError(''); setAbierto(true) }}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-dashed border-borde-fuerte px-4 text-base font-semibold text-azul"
      >
        <Icono nombre="mas" tamano={16} trazo={2.2} />Grupo
      </button>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo grupo">
        <form onSubmit={guardar} className="space-y-4">
          <input
            value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre del grupo" placeholder="Por ejemplo: Obra, Familia, Casas"
            maxLength={30} autoComplete="off" autoFocus className={clasesInput}
          />
          {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
          <Boton type="submit" disabled={enviando} className="w-full">Crear grupo</Boton>
        </form>
      </Sheet>
    </>
  )
}

/** Contactos (mockup v2): buscador, filtros por grupo y una lista con llamar y WhatsApp. */
export default function Contactos({ contactos, grupos }: { contactos: Contacto[]; grupos: Grupo[] }) {
  const [q, setQ, campo] = useTextoEscrito('')
  const [filtro, setFiltro] = useState<string>('todos')
  const nombreGrupo = new Map(grupos.map((g) => [g.id, g.nombre]))
  const lista = contactos.filter((c) => (filtro === 'todos' || c.grupoId === filtro) && coincide(c, q))

  return (
    <>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-2"><Icono nombre="buscar" tamano={20} /></span>
        <input
          {...campo} type="search" aria-label="Buscar" placeholder="Buscar por nombre o empresa" value={q}
          onChange={(e) => setQ(e.target.value)} className={`${clasesInput} pl-12`} autoComplete="off"
        />
      </div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrar por grupo">
        <Chip activo={filtro === 'todos'} aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos</Chip>
        {grupos.map((g) => (
          <Chip key={g.id} activo={filtro === g.id} aria-pressed={filtro === g.id} onClick={() => setFiltro(g.id)}>{g.nombre}</Chip>
        ))}
        <NuevoGrupo />
        {/* 20 px de margen al final para que "+ Grupo" se vea entero al deslizar */}
        <span aria-hidden="true" className="w-3 shrink-0" />
      </div>
      {lista.length === 0 ? (
        <EmptyState>{contactos.length === 0 ? 'Todavía no hay contactos. Tocá el + para agregar el primero.' : 'No hay contactos que coincidan.'}</EmptyState>
      ) : (
        <Lista>
          {lista.map((c) => (
            <li key={c.id} data-fila className={clasesFila}>
              <Avatar nombre={c.nombre} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-texto">{c.nombre}</p>
                {(c.empresa || c.grupoId) && (
                  <p className="text-base text-texto-2">{[c.empresa, c.grupoId && nombreGrupo.get(c.grupoId)].filter(Boolean).join(' · ')}</p>
                )}
                {c.nota && <p className="text-base whitespace-pre-wrap text-texto-2">{c.nota}</p>}
              </div>
              {c.telefono && (
                <div className="flex shrink-0 gap-2">
                  <BotonIcono nombre={`Llamar a ${c.nombre}`} icono="telefono" href={`tel:+${c.telefono}`} />
                  <BotonIcono nombre={`WhatsApp a ${c.nombre}`} icono="whatsapp" tono="verde" href={`https://wa.me/${c.telefono}`} externo />
                </div>
              )}
            </li>
          ))}
        </Lista>
      )}
    </>
  )
}
