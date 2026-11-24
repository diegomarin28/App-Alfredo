'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, BotonMas, Field, Sheet, clasesInput } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { subirArchivo } from '../../subida'

/**
 * "+" de la carpeta (mockup v2): primero la foto (cámara o galería), después el título, y "Guardar".
 * "Sacar otra" cambia la foto antes de guardar.
 */
export default function NuevoDocumento({ carpetaId }: { carpetaId: string }) {
  const router = useRouter()
  const camara = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista) }, [vista])

  function abrir() {
    setFoto(null); setVista(null); setTitulo(''); setError('')
    setAbierto(true)
  }
  function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const a = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!a) return
    setFoto(a)
    setVista(URL.createObjectURL(a))
    setError('')
  }
  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!foto) return
    if (!titulo.trim()) { setError('Poné un título.'); return }
    setSubiendo(true)
    setError('')
    const err = await subirArchivo({ tipo: 'documento', carpetaId, titulo }, foto)
    setSubiendo(false)
    if (err) { setError(err); return }
    setAbierto(false)
    router.refresh()
  }

  const clasesBoton = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold focus-within:ring-2 focus-within:ring-azul'
  return (
    <>
      <BotonMas nombre="Agregar documento" onClick={abrir} />
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo documento">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {vista ? (
            <div className="relative overflow-hidden rounded-2xl bg-gris">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vista} alt="La foto del documento" className="max-h-56 w-full object-contain" />
              <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-base font-semibold text-texto-2">Foto lista</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <label className={`${clasesBoton} bg-azul text-white`}>
                <Icono nombre="camara" tamano={20} /><span>Sacar foto</span>
                <input type="file" accept="image/*" capture="environment" onChange={elegida} className="sr-only" />
              </label>
              <label className={`${clasesBoton} bg-tinte text-azul`}>
                <Icono nombre="imagen" tamano={20} /><span>De la galería</span>
                <input type="file" accept="image/*" onChange={elegida} className="sr-only" />
              </label>
            </div>
          )}
          {foto && (
            <>
              <Field label="Título">
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} autoComplete="off" className={clasesInput} placeholder="Por ejemplo: Póliza del auto" />
              </Field>
              {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
              <div className="grid grid-cols-2 gap-2.5">
                <label className={`${clasesBoton} bg-tinte text-azul`}>
                  <Icono nombre="camara" tamano={20} /><span>Sacar otra</span>
                  <input ref={camara} type="file" accept="image/*" capture="environment" onChange={elegida} className="sr-only" />
                </label>
                <Boton type="submit" disabled={subiendo}>{subiendo ? 'Subiendo…' : 'Guardar'}</Boton>
              </div>
            </>
          )}
        </form>
      </Sheet>
    </>
  )
}
