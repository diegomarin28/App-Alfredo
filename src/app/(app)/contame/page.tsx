'use client'
import { useState, useSyncExternalStore } from 'react'
import { Boton, Card, Field, clasesInput } from '@/components/ui'
import type { Opcion } from '@/ai/contamePrompt'
import { useDictado } from '@/voz/useDictado'

type Fase = 'inicio' | 'revisar' | 'pregunta' | 'listo'
type Origen = 'voz' | 'teclado'
interface Linea { id: string; descripcion: string }

const MAX = 8000
const ERROR_GENERICO = 'No pude guardarlo, probá de nuevo.'
const nada = () => () => {}

const icono = (hijos: React.ReactNode, tam = 48) => (
  <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{hijos}</svg>
)
const MICROFONO = <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>
const PARAR = <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
const CHECK = <path d="M5 12.5l4.5 4.5L19 7.5" />

function Alerta({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{children}</div>
}

export default function Page() {
  const montado = useSyncExternalStore(nada, () => true, () => false)
  const dictado = useDictado({ lang: 'es-UY' })
  const [fase, setFase] = useState<Fase>('inicio')
  const [origen, setOrigen] = useState<Origen>('voz')
  const [editado, setEditado] = useState<string | null>(null)
  const [enviado, setEnviado] = useState('')
  const [respuestas, setRespuestas] = useState<string[]>([])
  const [pregunta, setPregunta] = useState<{ pregunta: string; opciones: Opcion[] } | null>(null)
  const [guardado, setGuardado] = useState<Linea[]>([])
  const [loteId, setLoteId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [deshecho, setDeshecho] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teclado = origen === 'teclado' || !dictado.soportado
  // Mientras no se edite, la caja sigue al dictado (pueden llegar los últimos resultados después de terminar).
  const texto = editado ?? (teclado ? '' : dictado.texto)

  function terminar() {
    dictado.terminar()
    setOrigen('voz')
    setEditado(null)
    setFase('revisar')
  }

  function grabarDeNuevo() {
    dictado.borrar()
    setEditado(null)
    setOrigen('voz')
    setError(null)
    setFase('inicio')
    dictado.empezar()
  }

  function escribir() {
    if (dictado.escuchando) dictado.terminar()
    setOrigen('teclado')
    setEditado(null)
    setFase('revisar')
  }

  async function enviar(t: string, resp: string[]) {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/contame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resp.length ? { texto: t, respuestas: resp } : { texto: t }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        guardado?: Linea[]; loteId?: string; aviso?: string; pregunta?: string; opciones?: Opcion[]; error?: string
      }
      if (Array.isArray(j.guardado) && typeof j.loteId === 'string') {
        setGuardado(j.guardado)
        setLoteId(j.loteId)
        setAviso(typeof j.aviso === 'string' ? j.aviso : null)
        setDeshecho(false)
        setFase('listo')
      } else if (typeof j.pregunta === 'string' && Array.isArray(j.opciones)) {
        setEnviado(t)
        setRespuestas(resp)
        setPregunta({ pregunta: j.pregunta, opciones: j.opciones })
        setFase('pregunta')
      } else setError(j.error ?? ERROR_GENERICO)
    } catch {
      setError(ERROR_GENERICO)
    } finally {
      setCargando(false)
    }
  }

  async function deshacer() {
    if (!loteId) return
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/contame/deshacer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loteId }),
      })
      if (res.ok) setDeshecho(true)
      else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'No pude deshacerlo, probá de nuevo.')
    } catch {
      setError('No pude deshacerlo, probá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  function otraCosa() {
    dictado.borrar()
    setFase('inicio')
    setOrigen('voz')
    setEditado(null)
    setEnviado('')
    setRespuestas([])
    setPregunta(null)
    setGuardado([])
    setLoteId(null)
    setAviso(null)
    setDeshecho(false)
    setError(null)
  }

  /** Revisar lo dictado cuando dejó de escuchar solo (error o silencio largo). */
  function revisar() {
    setOrigen('voz')
    setEditado(null)
    setFase('revisar')
  }

  const vista = fase === 'inicio' && teclado ? 'revisar' : fase

  return (
    <main className="space-y-5">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Contame</h1>
      {!montado ? null : (
        <>
          {vista === 'inicio' && (
            <div className="space-y-5">
              <p className="text-base text-texto-2">Contame lo que pasó: un pago, un arreglo, algo para acordarte. Yo lo guardo donde va.</p>
              <button
                type="button"
                onClick={dictado.escuchando ? terminar : dictado.empezar}
                aria-pressed={dictado.escuchando}
                className="mx-auto flex flex-col items-center gap-3"
              >
                <span
                  className={`flex size-28 items-center justify-center rounded-full text-white shadow-lg ${
                    dictado.escuchando ? 'bg-azul-osc ring-8 ring-tinte' : 'bg-azul hover:bg-azul-osc'
                  }`}
                >
                  {icono(dictado.escuchando ? PARAR : MICROFONO)}
                </span>
                <span className="text-xl font-semibold text-texto">{dictado.escuchando ? 'Tocá para terminar' : 'Tocá para hablar'}</span>
              </button>
              {dictado.escuchando && (
                <Card className="space-y-2">
                  <p className="text-base font-medium text-azul">Te escucho… podés hacer pausas.</p>
                  <p aria-live="polite" className="min-h-12 text-lg text-texto">{dictado.texto}</p>
                </Card>
              )}
              {!dictado.escuchando && dictado.texto && (
                <Card className="space-y-3">
                  <p className="text-lg text-texto">{dictado.texto}</p>
                  <Boton className="min-h-12 w-full" onClick={revisar}>Revisar y enviar</Boton>
                </Card>
              )}
              {dictado.error && <Alerta>{dictado.error}</Alerta>}
              {!dictado.escuchando && (
                <Boton variante="suave" className="w-full" onClick={escribir}>Escribir o pegar texto</Boton>
              )}
            </div>
          )}

          {vista === 'revisar' && (
            <Card className="space-y-3">
              <Field
                label={teclado ? 'Escribí o dictá con el teclado' : 'Lo que entendí · podés corregirlo'}
                hint={teclado ? 'También podés pegar un texto largo.' : undefined}
              >
                <textarea
                  className={`${clasesInput} min-h-40 py-2 text-lg`}
                  maxLength={MAX}
                  value={texto}
                  onChange={(e) => setEditado(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {dictado.soportado && !teclado && <Boton variante="suave" onClick={grabarDeNuevo}>Grabar de nuevo</Boton>}
                {dictado.soportado && teclado && <Boton variante="suave" onClick={grabarDeNuevo}>Usar el micrófono</Boton>}
                <Boton
                  className={dictado.soportado ? '' : 'col-span-2'}
                  disabled={cargando || !texto.trim()}
                  onClick={() => enviar(texto.trim(), [])}
                >
                  Enviar
                </Boton>
              </div>
            </Card>
          )}

          {vista === 'pregunta' && pregunta && (
            <Card className="space-y-4">
              <p className="text-xl font-semibold text-texto">{pregunta.pregunta}</p>
              <div className="space-y-3">
                {pregunta.opciones.map((o) => (
                  <Boton
                    key={o.etiqueta}
                    variante={o.respuesta === 'otra cosa' ? 'suave' : 'primario'}
                    className="min-h-14 w-full text-lg"
                    disabled={cargando}
                    onClick={() => enviar(enviado, [...respuestas, o.respuesta])}
                  >
                    {o.etiqueta}
                  </Boton>
                ))}
              </div>
            </Card>
          )}

          {vista === 'listo' && (
            <Card className="space-y-4">
              {deshecho ? (
                <p role="status" className="text-xl font-semibold text-texto">Listo, lo deshice.</p>
              ) : (
                <>
                  <p className="text-xl font-semibold text-texto">Listo, lo guardé:</p>
                  <ul className="space-y-3">
                    {guardado.map((g) => (
                      <li key={g.id} className="flex items-start gap-3 text-base text-texto">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-tinte text-azul">{icono(CHECK, 18)}</span>
                        <span>{g.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                  {aviso && <p role="status" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{aviso}</p>}
                </>
              )}
              <div className="flex flex-col gap-3">
                {!deshecho && <Boton variante="suave" className="min-h-12 w-full" disabled={cargando} onClick={deshacer}>Deshacer</Boton>}
                <Boton className="min-h-12 w-full" onClick={otraCosa}>Contar otra cosa</Boton>
              </div>
            </Card>
          )}

          {cargando && <p role="status" className="text-base text-texto-2">Guardando…</p>}
          {error && <Alerta>{error}</Alerta>}
        </>
      )}
    </main>
  )
}
