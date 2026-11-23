'use client'
import { useState } from 'react'
import { Card, Chip, EmptyState, clasesInput } from '@/components/ui'
import { coincide, formatearTelUY } from '@/domain/contactos'
import type { Contacto } from '@/domain/tipos'

type Filtro = 'todos' | Contacto['tipo']
const FILTROS: [Filtro, string][] = [['todos', 'Todos'], ['cliente', 'Clientes'], ['proveedor', 'Proveedores'], ['otro', 'Otros']]
const ETIQUETA: Record<Contacto['tipo'], string> = { cliente: 'Cliente', proveedor: 'Proveedor', otro: 'Otro' }
const boton = 'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-5 text-base font-semibold'

export default function Contactos({ contactos }: { contactos: Contacto[] }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = contactos.filter((c) => (filtro === 'todos' || c.tipo === filtro) && coincide(c, q))

  return (
    <>
      <input
        type="search" aria-label="Buscar" placeholder="Buscar por nombre o empresa" value={q}
        onChange={(e) => setQ(e.target.value)} className={clasesInput} autoComplete="off"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        {FILTROS.map(([v, t]) => <Chip key={v} activo={filtro === v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{t}</Chip>)}
      </div>
      {lista.length === 0 && (
        <EmptyState>{contactos.length === 0 ? 'Todavía no hay contactos. Agregá el primero con el botón de arriba.' : 'No encontré contactos con esa búsqueda.'}</EmptyState>
      )}
      <ul className="space-y-3">
        {lista.map((c) => (
          <li key={c.id}>
            <Card className="space-y-2">
              <div>
                <p className="text-lg font-semibold">{c.nombre}</p>
                <p className="text-base text-texto-2">{[c.empresa, ETIQUETA[c.tipo]].filter(Boolean).join(' · ')}</p>
                {c.telefono && <p className="text-base">{formatearTelUY(c.telefono)}</p>}
              </div>
              {c.nota && <p className="text-base whitespace-pre-wrap">{c.nota}</p>}
              {c.telefono && (
                <div className="flex gap-2">
                  <a href={`tel:+${c.telefono}`} className={`${boton} bg-azul text-white`}>Llamar</a>
                  <a href={`https://wa.me/${c.telefono}`} className={`${boton} bg-gris text-texto`}>WhatsApp</a>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
