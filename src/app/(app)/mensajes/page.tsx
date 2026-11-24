'use client'
import { useState } from 'react'
import { Boton, Card, Field, clasesInput } from '@/components/ui'
import IconoWhatsApp from '@/components/IconoWhatsApp'
import { waLink } from '@/domain/telefono'

type Modo = 'responder' | 'escribir'

export default function Page() {
  const [modo, setModo] = useState<Modo | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [idea, setIdea] = useState('')
  const [texto, setTexto] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function pedir(variante?: 'formal' | 'otra') {
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

  return (
    <main className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Mensajes</h1>
      <div className="grid grid-cols-2 gap-3">
        <Boton variante={modo === 'responder' ? 'primario' : 'suave'} className="min-h-16" aria-pressed={modo === 'responder'} onClick={() => elegir('responder')}>Me escribieron</Boton>
        <Boton variante={modo === 'escribir' ? 'primario' : 'suave'} className="min-h-16" aria-pressed={modo === 'escribir'} onClick={() => elegir('escribir')}>Quiero escribir</Boton>
      </div>

      {modo === 'responder' && (
        <Card className="space-y-3">
          <Field label="Pegá el mensaje que te mandaron">
            <textarea className={`${clasesInput} min-h-32 py-2`} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          </Field>
          <Boton disabled={cargando || !listo} onClick={() => pedir()}>{cargando && !texto ? 'Escribiendo…' : 'Sugerir respuesta'}</Boton>
        </Card>
      )}
      {modo === 'escribir' && (
        <Card className="space-y-3">
          <Field label="¿A quién?">
            <input className={clasesInput} value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
          </Field>
          <Field label="¿Qué le querés decir?">
            <textarea className={`${clasesInput} min-h-28 py-2`} value={idea} onChange={(e) => setIdea(e.target.value)} />
          </Field>
          <Boton disabled={cargando || !listo} onClick={() => pedir()}>{cargando && !texto ? 'Escribiendo…' : 'Escribir mensaje'}</Boton>
        </Card>
      )}

      {cargando && <p role="status" className="text-base text-texto-2">Escribiendo…</p>}
      {error && <div role="alert" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{error}</div>}

      {texto !== null && (
        <Card className="space-y-3">
          <Field label="Mensaje sugerido">
            <textarea className={`${clasesInput} min-h-36 py-2`} value={texto} onChange={(e) => { setTexto(e.target.value); setCopiado(false) }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</Boton>
            <a
              href={waLink(texto)} target="_blank" rel="noopener noreferrer" aria-label="Enviar por WhatsApp"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-azul px-4 text-base font-semibold whitespace-nowrap text-white hover:bg-azul-osc"
            >
              <IconoWhatsApp />WhatsApp
            </a>
            <Boton variante="suave" disabled={cargando} onClick={() => pedir('formal')}>Más formal</Boton>
            <Boton variante="suave" disabled={cargando} onClick={() => pedir('otra')}>Otra</Boton>
          </div>
        </Card>
      )}
    </main>
  )
}
