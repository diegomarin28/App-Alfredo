'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ui'

export interface ItemDoc { id: string; titulo: string; url: string; fecha: string }

export default function Galeria({ items }: { items: ItemDoc[] }) {
  const [abierto, setAbierto] = useState<ItemDoc | null>(null)
  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5">
        {items.map((d) => (
          <li key={d.id}>
            <button type="button" aria-label={`Abrir ${d.titulo}`} onClick={() => setAbierto(d)}
              className="block min-h-11 w-full overflow-hidden rounded-2xl border border-borde bg-white text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.url} alt={d.titulo} className="aspect-[4/3] w-full object-cover" />
              <span className="block px-3 py-2.5">
                <span className="block truncate text-base font-semibold text-texto">{d.titulo}</span>
                <span className="block text-base text-texto-2">{d.fecha}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet abierto={abierto !== null} onCerrar={() => setAbierto(null)} titulo={abierto?.titulo ?? ''}>
        {abierto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={abierto.url} alt={abierto.titulo} className="w-full rounded-xl" />
        )}
      </Sheet>
    </>
  )
}
