'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Sheet } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { useBorrar } from '@/components/Borrar'
import { subirArchivo } from '../subida'
import { borrarFoto } from './actions'
import Encuadre from './Encuadre'
import Visor from './Visor'

export interface ItemFoto { id: string; url: string; focoX?: number; focoY?: number }

interface PorSubir { clave: string; archivo: File; url: string; foco: { x: number; y: number } }

/**
 * Fotos (mockup v2 + pedidos de Diego): "Elegir varias" y "Sacar foto" abren una vista previa para encuadrar cada
 * foto en el marco de Inicio (y quitar las que no); grilla de 3; tocar una foto la abre en grande.
 */
export default function Fotos({ items }: { items: ItemFoto[] }) {
  const router = useRouter()
  const borrar = useBorrar()
  const grilla = useRef<HTMLUListElement>(null)
  const [ocultas, setOcultas] = useState<Set<string>>(new Set())
  const [visor, setVisor] = useState<number | null>(null)
  const [porSubir, setPorSubir] = useState<PorSubir[]>([])
  const [progreso, setProgreso] = useState<{ va: number; de: number } | null>(null)
  const [error, setError] = useState('')
  const visibles = items.filter((f) => !ocultas.has(f.id))

  // las vistas previas se liberan al cerrarse
  useEffect(() => () => porSubir.forEach((p) => URL.revokeObjectURL(p.url)), [porSubir])

  function elegidas(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.currentTarget.files ?? [])]
    e.currentTarget.value = ''
    if (archivos.length === 0) return
    setError('')
    setPorSubir((antes) => [...antes, ...archivos.map((archivo, i) => ({
      clave: `${Date.now()}-${i}-${archivo.name}`, archivo, url: URL.createObjectURL(archivo), foco: { x: 0.5, y: 0.5 },
    }))])
  }

  async function subir() {
    const lista = porSubir
    setError('')
    let fallo = ''
    for (const [i, p] of lista.entries()) {
      setProgreso({ va: i + 1, de: lista.length })
      const err = await subirArchivo({ tipo: 'foto', focoX: p.foco.x, focoY: p.foco.y }, p.archivo)
      if (err) fallo = err
    }
    setProgreso(null)
    setPorSubir([])
    if (fallo) setError(fallo)
    router.refresh()
  }

  function borrarFotoGrande(f: ItemFoto) {
    const tile = grilla.current?.querySelector<HTMLElement>(`[data-foto="${f.id}"]`) ?? null
    setOcultas((o) => new Set(o).add(f.id))
    void borrar({
      nombre: 'la foto', accion: borrarFoto.bind(null, f.id), fila: tile,
      alDeshacer: () => setOcultas((o) => { const n = new Set(o); n.delete(f.id); return n }),
    })
  }

  const ocupado = progreso !== null
  const clasesBoton = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold focus-within:ring-2 focus-within:ring-azul'
  const foco = (f: ItemFoto) => `${(f.focoX ?? 0.5) * 100}% ${(f.focoY ?? 0.5) * 100}%`
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
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      {visibles.length > 0 && (
        <>
          <ul ref={grilla} className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-2xl">
            {items.map((f) => (
              <li key={f.id} data-fila data-foto={f.id}>
                <button type="button" aria-label="Ver foto" onClick={() => setVisor(visibles.findIndex((v) => v.id === f.id))} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="Foto familiar" className="aspect-square w-full object-cover" style={{ objectPosition: foco(f) }} />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-base text-texto-2">Tocá una foto para verla grande o borrarla.</p>
        </>
      )}

      {visor !== null && visibles.length > 0 && (
        <Visor fotos={visibles} inicio={visor} onCerrar={() => setVisor(null)} onBorrar={(f) => borrarFotoGrande(visibles.find((v) => v.id === f.id)!)} />
      )}

      <Sheet abierto={porSubir.length > 0} onCerrar={() => { if (!ocupado) setPorSubir([]) }} titulo="Subir fotos">
        <div className="space-y-4">
          <p className="text-base text-texto-2">Así se van a ver en Inicio. Arrastrá cada foto para encuadrarla.</p>
          <ul className="space-y-4">
            {porSubir.map((p, i) => (
              <li key={p.clave} className="space-y-2">
                <Encuadre
                  url={p.url} foco={p.foco} nombre={`Foto ${i + 1}`}
                  onFoco={(foco) => setPorSubir((l) => l.map((x) => (x.clave === p.clave ? { ...x, foco } : x)))}
                />
                <button
                  type="button" disabled={ocupado} onClick={() => setPorSubir((l) => l.filter((x) => x.clave !== p.clave))}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-semibold text-rojo"
                >
                  <Icono nombre="cerrar" tamano={18} trazo={2} />Quitar
                </button>
              </li>
            ))}
          </ul>
          {/* el botón queda siempre a la vista, aunque haya muchas fotos para bajar */}
          <div className="sticky -bottom-[calc(1.25rem+env(safe-area-inset-bottom))] -mx-5 space-y-2 border-t border-borde bg-white px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:-bottom-5 lg:pb-5">
            {progreso && <p role="status" className="text-base text-texto-2">Subiendo {progreso.va} de {progreso.de}…</p>}
            <Boton className="w-full" disabled={ocupado || porSubir.length === 0} onClick={subir}>
              {porSubir.length === 1 ? 'Subir 1 foto' : `Subir ${porSubir.length} fotos`}
            </Boton>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
