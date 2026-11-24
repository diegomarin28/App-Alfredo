'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Card, IconoTile, Lista, Seccion, clasesFila, clasesInput } from '@/components/ui'
import { Icono, type NombreIcono } from '@/components/iconos'
import type { Guardado } from '@/domain/ultimos'
import type { Opcion } from '@/ai/contamePrompt'
import { useDictado } from '@/voz/useDictado'

type Fase = 'inicio' | 'revisar' | 'pregunta' | 'listo'
type Origen = 'voz' | 'teclado'
interface Linea { id: string; descripcion: string }

const MAX = 8000
const ERROR_GENERICO = 'No pude guardarlo, probá de nuevo.'
const nada = () => () => {}

function Alerta({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{children}</div>
}

const ICONO_CLASE: Record<Guardado['clase'], [NombreIcono, 'azul' | 'naranja' | 'verde' | 'gris']> = {
  casa: ['casa', 'verde'], vencimiento: ['reloj', 'naranja'], pendiente: ['tilde', 'gris'], nota: ['mensaje', 'gris'],
  contacto: ['personas', 'azul'], fecha: ['torta', 'azul'], recordatorio: ['campana', 'naranja'],
}

/** 0:12 */
const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Segundos desde que empezó a escuchar (para "Te escucho · 0:12"). */
function useSegundos(activo: boolean): number {
  const [s, setS] = useState(0)
  useEffect(() => {
    if (!activo) return
    setS(0)
    const t = setInterval(() => setS((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [activo])
  return s
}

export default function Contame({ ultimos }: { ultimos: Guardado[] }) {
  const router = useRouter()
  const montado = useSyncExternalStore(nada, () => true, () => false)
  const dictado = useDictado({ lang: 'es-UY' })
  const segundos = useSegundos(dictado.escuchando)
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
        // lo guardado cambia otras pantallas (Inicio, Pendientes…): que el menú no muestre lo de antes
        router.refresh()
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
      if (res.ok) { setDeshecho(true); router.refresh() }
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

  const clasesTitulo = 'text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto'
  return (
    <main className="space-y-4">
      <h1 className={clasesTitulo}>Contame</h1>
      {!montado ? null : (
        <>
          {vista === 'inicio' && (
            <div className="space-y-5">
              {!dictado.escuchando && <p className="text-base text-texto-2">Contame qué pasó y yo lo guardo donde va.</p>}
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={dictado.escuchando ? terminar : dictado.empezar}
                  aria-pressed={dictado.escuchando}
                  aria-label={dictado.escuchando ? 'Tocá para terminar' : 'Tocá para hablar'}
                  className="relative flex size-40 items-center justify-center rounded-full"
                >
                  {/* anillos: quietos esperando; respiran mientras escucha (con "reducir movimiento", solo cambian de opacidad) */}
                  <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-tinte ${dictado.escuchando ? 'animate-respirar' : ''}`} />
                  {dictado.escuchando && <span aria-hidden="true" className="absolute inset-3 rounded-full bg-borde-fuerte/60 animate-respirar [animation-delay:400ms]" />}
                  <span aria-hidden="true" className="relative flex size-28 items-center justify-center rounded-full bg-azul text-white shadow-[0_8px_24px_rgba(31,78,140,0.28)]">
                    <Icono nombre={dictado.escuchando ? 'parar' : 'microfono'} tamano={dictado.escuchando ? 44 : 40} trazo={2} />
                  </span>
                </button>
                {dictado.escuchando ? (
                  <div className="text-center">
                    <p aria-hidden="true" className="text-[17px] font-bold text-texto">Te escucho · {reloj(segundos)}</p>
                    <p className="text-base text-texto-2">Podés hacer pausas. Tocá para terminar.</p>
                  </div>
                ) : (
                  <p aria-hidden="true" className="text-[17px] font-bold text-texto">Tocá para hablar</p>
                )}
                {!dictado.escuchando && (
                  <button type="button" onClick={escribir} className="min-h-11 rounded-xl px-3 text-base font-semibold text-azul">Prefiero escribir</button>
                )}
              </div>
              {dictado.escuchando && (
                <Card>
                  <p aria-live="polite" className="min-h-12 text-[17px] leading-relaxed text-texto">{dictado.texto}</p>
                </Card>
              )}
              {!dictado.escuchando && dictado.texto && (
                <Card className="space-y-3">
                  <p className="text-[17px] text-texto">{dictado.texto}</p>
                  <Boton className="w-full" onClick={revisar}>Revisar y enviar</Boton>
                </Card>
              )}
              {dictado.error && <Alerta>{dictado.error}</Alerta>}
              {!dictado.escuchando && !dictado.texto && ultimos.length > 0 && (
                <Seccion id="ultimo" titulo="Lo último que guardé">
                  <Lista>
                    {ultimos.map((u) => (
                      <li key={u.id} className={clasesFila}>
                        <IconoTile nombre={ICONO_CLASE[u.clase][0]} tono={ICONO_CLASE[u.clase][1]} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-texto">{u.titulo}</span>
                          <span className="block text-base text-texto-2">{u.detalle}</span>
                        </span>
                      </li>
                    ))}
                  </Lista>
                </Seccion>
              )}
            </div>
          )}

          {vista === 'revisar' && (
            <div className="space-y-4">
              <p className="text-base text-texto-2">
                {teclado ? 'Escribí o pegá lo que querés guardar.' : 'Esto entendí. Podés corregirlo antes de mandar.'}
              </p>
              <textarea
                aria-label={teclado ? 'Escribí o dictá con el teclado' : 'Lo que entendí · podés corregirlo'}
                className={`${clasesInput} min-h-40 py-3 text-[17px] leading-relaxed`}
                maxLength={MAX}
                value={texto}
                onChange={(e) => setEditado(e.target.value)}
              />
              <Boton className="w-full" disabled={cargando || !texto.trim()} onClick={() => enviar(texto.trim(), [])}>Enviar</Boton>
              {dictado.soportado && (
                <div className="flex justify-center">
                  <button type="button" onClick={grabarDeNuevo} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold text-azul">
                    <Icono nombre={teclado ? 'microfono' : 'repetir'} tamano={18} />{teclado ? 'Usar el micrófono' : 'Repetir'}
                  </button>
                </div>
              )}
            </div>
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
                      <li key={g.id} className="flex items-start gap-3 text-base text-texto motion-safe:animate-entrar">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-tinte text-azul"><Icono nombre="tilde" tamano={16} trazo={2.4} /></span>
                        <span>{g.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                  {aviso && <p role="status" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{aviso}</p>}
                </>
              )}
              <div className="flex flex-col gap-3">
                {!deshecho && <Boton variante="suave" className="w-full" disabled={cargando} onClick={deshacer}>Deshacer</Boton>}
                <Boton className="w-full" onClick={otraCosa}>Contar otra cosa</Boton>
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
