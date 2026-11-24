'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Sheet } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { useBorrar } from '@/components/Borrar'
import { subirArchivo } from '../subida'
import { borrarFoto } from './actions'

export interface ItemFoto { id: string; url: string }

/** Fotos (mockup v2): "Elegir varias" y "Sacar foto", grilla de 3 y la foto grande para verla o borrarla. */
export default function Fotos({ items }: { items: ItemFoto[] }) {
  const router = useRouter()
  const borrar = useBorrar()
  const grilla = useRef<HTMLUListElement>(null)
  const [abierta, setAbierta] = useState<ItemFoto | null>(null)
  const [progreso, setProgreso] = useState<{ va: number; de: number } | null>(null)
  const [error, setError] = useState('')

  async function elegidas(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const archivos = [...(input.files ?? [])]
    if (archivos.length === 0) return
    setError('')
    let fallo = ''
    for (const [i, a] of archivos.entries()) {
      setProgreso({ va: i + 1, de: archivos.length })
      const err = await subirArchivo({ tipo: 'foto' }, a)
      if (err) fallo = err
    }
    input.value = ''
    setProgreso(null)
    if (fallo) setError(fallo)
    router.refresh()
  }

  function borrarAbierta() {
    if (!abierta) return
    const tile = grilla.current?.querySelector<HTMLElement>(`[data-foto="${abierta.id}"]`) ?? null
    setAbierta(null)
    void borrar({ nombre: 'la foto', accion: borrarFoto.bind(null, abierta.id), fila: tile })
  }

  const ocupado = progreso !== null
  const clasesBoton = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold focus-within:ring-2 focus-within:ring-azul'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <label className={`${clasesBoton} bg-azul text-white ${ocupado ? 'opacity-60' : ''}`}>
          <Icono nombre="imagen" tamano={20} /><span>Elegir varias</span>
          <input type="file" accept="image/*" multiple disabled={ocupado} onChange={elegidas} className="sr-only" />
        </label>
        <label className={`${clasesBoton} bg-tinte text-azul ${ocupado ? 'opacity-60' : ''}`}>
          <Icono nombre="camara" tamano={20} /><span>Sacar foto</span>
          <input type="file" accept="image/*" capture="environment" disabled={ocupado} onChange={elegidas} className="sr-only" />
        </label>
      </div>
      {progreso && <p role="status" className="text-base text-texto-2">Subiendo {progreso.de > 1 ? `${progreso.va} de ${progreso.de}` : ''}…</p>}
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      {items.length > 0 && (
        <>
          <ul ref={grilla} className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-2xl">
            {items.map((f) => (
              <li key={f.id} data-fila data-foto={f.id}>
                <button type="button" aria-label="Ver foto" onClick={() => setAbierta(f)} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="Foto familiar" className="aspect-square w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-base text-texto-2">Tocá una foto para verla grande o borrarla.</p>
        </>
      )}
      <Sheet abierto={abierta !== null} onCerrar={() => setAbierta(null)} titulo="Foto">
        {abierta && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={abierta.url} alt="Foto familiar" className="max-h-[60dvh] w-full rounded-xl object-contain" />
            <Boton variante="peligro" className="w-full" onClick={borrarAbierta}><Icono nombre="basura" tamano={20} />Borrar foto</Boton>
          </div>
        )}
      </Sheet>
    </div>
  )
}
