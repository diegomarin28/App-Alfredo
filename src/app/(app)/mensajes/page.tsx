'use client'
import { useState } from 'react'
import { Boton, Card, Field, clasesInput } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import { Dados, Padel } from '@/components/detalles'
import { Icono } from '@/components/iconos'
import IconoWhatsApp from '@/components/IconoWhatsApp'
import { waLink } from '@/domain/telefono'

type Modo = 'responder' | 'escribir'
const MODOS = [['responder', 'Me escribieron'], ['escribir', 'Quiero escribir']] as const

export default function Page() {
  const [modo, setModo] = useState<Modo>('responder')
  const [mensaje, setMensaje] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [idea, setIdea] = useState('')
  const [texto, setTexto] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  // qué se está pidiendo: la respuesta (pádel), otra versión (dados) o más formal
  const [pedido, setPedido] = useState<'nueva' | 'formal' | 'otra'>('nueva')
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function pedir(variante?: 'formal' | 'otra') {
    setPedido(variante ?? 'nueva')
    setCargando(true)
    setError(null)
    setCopiado(false)
    const cuerpo = modo === 'responder' ? { modo, mensaje } : { modo, destinatario, idea }
    try {
      const res = await fetch('/api/ai/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variante ? { ...cuerpo, variante, anterior: texto ?? undefined } : cuerpo),
      })
      const j = (await res.json().catch(() => ({}))) as { texto?: string; error?: string }
      if (typeof j.texto === 'string') setTexto(j.texto)
      else setError(j.error ?? 'No pude escribir el mensaje, probá de nuevo.')
    } catch {
      setError('No pude escribir el mensaje, probá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto ?? '')
      setCopiado(true)
    } catch {
      setError('No pude copiar. Mantené apretado el texto para copiarlo.')
    }
  }

  const elegir = (m: Modo) => { setModo(m); setTexto(null); setError(null) }
  const listo = modo === 'responder' ? mensaje.trim() : destinatario.trim() && idea.trim()

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText()
      if (t) setMensaje(t)
    } catch {
      setError('No pude pegar. Mantené apretado el cuadro y elegí Pegar.')
    }
  }

  return (
    <main className="space-y-4">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">Mensajes</h1>
      <Segmentado etiqueta="Qué querés hacer" opciones={MODOS} valor={modo} onCambio={elegir} />

      {modo === 'responder' && (
        <div className="space-y-3">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="recibido" className="text-base font-semibold text-texto">El mensaje que te mandaron</label>
            <button type="button" onClick={pegar} className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-semibold text-azul">
              <Icono nombre="portapapeles" tamano={18} />Pegar
            </button>
          </div>
          <textarea id="recibido" aria-label="Pegá el mensaje que te mandaron" className={`${clasesInput} min-h-28 py-3`} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          <Boton className="w-full" disabled={cargando || !listo} onClick={() => pedir()}>{cargando && !texto ? 'Escribiendo…' : 'Sugerir respuesta'}</Boton>
        </div>
      )}
      {modo === 'escribir' && (
        <div className="space-y-3">
          <Field label="¿A quién?">
            <input className={clasesInput} value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
          </Field>
          <Field label="¿Qué le querés decir?">
            <textarea className={`${clasesInput} min-h-28 py-3`} value={idea} onChange={(e) => setIdea(e.target.value)} />
          </Field>
          <Boton className="w-full" disabled={cargando || !listo} onClick={() => pedir()}>{cargando && !texto ? 'Escribiendo…' : 'Escribir mensaje'}</Boton>
        </div>
      )}

      {cargando && pedido === 'nueva' && <Padel texto="Escribiendo" />}
      {cargando && pedido === 'formal' && <p role="status" className="text-base text-texto-2">Escribiendo…</p>}
      {error && <div role="alert" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{error}</div>}

      {texto !== null && (
        <Card className="space-y-3 motion-safe:animate-entrar">
          <label htmlFor="sugerido" className="block text-base font-semibold text-texto">
            {cargando && pedido === 'otra' ? 'Otra versión' : 'Respuesta sugerida'}
          </label>
          {/* backgammon (mockup v2): los dados ruedan mientras escribe otra versión */}
          {cargando && pedido === 'otra' && <><Dados /><span role="status" className="sr-only">Escribiendo otra versión…</span></>}
          <textarea id="sugerido" aria-label="Mensaje sugerido" className={`${clasesInput} min-h-32 bg-fondo py-3 leading-snug transition-opacity duration-300 ${cargando && pedido !== 'nueva' ? 'opacity-25' : ''}`} value={texto} onChange={(e) => { setTexto(e.target.value); setCopiado(false) }} />
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={waLink(texto)} target="_blank" rel="noopener noreferrer" aria-label="Enviar por WhatsApp"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-azul px-4 text-base font-semibold whitespace-nowrap text-white hover:bg-azul-osc"
            >
              <IconoWhatsApp />WhatsApp
            </a>
            <Boton variante="suave" onClick={copiar}><Icono nombre="copiar" tamano={20} />{copiado ? 'Copiado' : 'Copiar'}</Boton>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={cargando} onClick={() => pedir('formal')} className="min-h-11 rounded-xl text-base font-semibold text-azul disabled:opacity-60">Más formal</button>
            <button type="button" disabled={cargando} onClick={() => pedir('otra')} className="min-h-11 rounded-xl text-base font-semibold text-azul disabled:opacity-60">Otra versión</button>
          </div>
        </Card>
      )}
    </main>
  )
}
