'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'

const clasesBoton = 'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-center text-base leading-tight font-semibold focus-within:ring-2 focus-within:ring-azul'

/** Dos botones (cámara / galería): comprime a 1600px y sube a POST /api/archivos. */
export default function Subir({ tipo, carpetaId }: { tipo: 'documento' | 'foto'; carpetaId?: string }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  async function elegido(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const archivo = input.files?.[0]
    if (!archivo) return
    setError('')
    setSubiendo(true)
    try {
      let blob: Blob = archivo
      try {
        blob = await imageCompression(archivo, { maxWidthOrHeight: 1600, initialQuality: 0.8, fileType: 'image/jpeg', useWebWorker: false })
      } catch { /* si no se puede comprimir (p. ej. HEIC en un navegador viejo) se sube tal cual */ }
      const f = new FormData()
      f.set('tipo', tipo)
      if (carpetaId) f.set('carpetaId', carpetaId)
      if (tipo === 'documento') f.set('titulo', titulo)
      f.set('file', blob, 'foto.jpg')
      const res = await fetch('/api/archivos', { method: 'POST', body: f })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'No se pudo subir. Probá de nuevo.')
        return
      }
      setTitulo('')
      router.refresh()
    } catch {
      setError('No se pudo subir. Probá de nuevo.')
    } finally {
      input.value = ''
      setSubiendo(false)
    }
  }

  // Documentos: sin título no se abre la cámara (si no, la foto sacada se perdería al rechazarla el servidor).
  const faltaTitulo = tipo === 'documento' && !titulo.trim()
  const bloqueado = subiendo || faltaTitulo
  const apagado = faltaTitulo ? 'cursor-not-allowed opacity-50' : ''

  return (
    <div className="space-y-3">
      {tipo === 'documento' && (
        <label className="block">
          <span className="mb-1 block text-base font-medium text-texto">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} name="titulo" maxLength={80} autoComplete="off" className="min-h-11 w-full rounded-xl border border-borde bg-white px-3 text-base text-texto" />
        </label>
      )}
      {faltaTitulo && <p className="text-base text-texto-2">Primero poné un título</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className={`${clasesBoton} bg-azul text-white ${apagado}`}>
          <span>Sacar foto</span>
          <input type="file" accept="image/*" capture="environment" disabled={bloqueado} onChange={elegido} className="sr-only" />
        </label>
        <label className={`${clasesBoton} bg-gris text-texto ${apagado}`}>
          <span>Elegir de la galería</span>
          <input type="file" accept="image/*" disabled={bloqueado} onChange={elegido} className="sr-only" />
        </label>
      </div>
      {subiendo && <p role="status" className="text-base text-texto-2">Subiendo…</p>}
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
    </div>
  )
}
