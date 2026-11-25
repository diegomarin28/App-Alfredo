'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Card, IconoTile, Lista, Seccion, clasesFila, clasesInput } from '@/components/ui'
import { Icono, type NombreIcono } from '@/components/iconos'
import type { Guardado } from '@/domain/ultimos'
import { Padel } from '@/components/detalles'
import type { Accion, Opcion } from '@/ai/contamePrompt'
import Revision, { type DudaRevision, type FilaRevision } from './Revision'
import { useDictadoCompartido, type DictadoCompartido } from '@/voz/DictadoCompartido'
import { soltarPuente, tomarTeclado as tomarTecladoYa } from '@/voz/puenteTeclado'
import AvisoTeclado from './AvisoTeclado'

/** 'teclado' (ronda 11): la caja grande para dictar con el 🎤 del teclado o escribir; con "Listo" sigue como siempre. */
type Fase = 'inicio' | 'teclado' | 'pregunta' | 'propuesta' | 'listo'
interface Linea { id: string; descripcion: string }

/** Ronda 12: el aviso de cómo no tener que dar permiso cada vez, una sola vez por apertura (en memoria). */
export const _avisos = { permiso: false }

function usarDictado(): DictadoCompartido {
  const d = useDictadoCompartido()
  if (!d) throw new Error('Contame necesita el ProveedorDictado del layout')
  return d
}

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

export default function Contame({ ultimos, hoy }: { ultimos: Guardado[]; hoy: string }) {
  const router = useRouter()
  const montado = useSyncExternalStore(nada, () => true, () => false)
  const [fase, setFase] = useState<Fase>('inicio')
  const [editado, setEditado] = useState<string | null>(null)
  // Ronda 12: el dictado vive en el layout (el micrófono del menú lo arranca antes de llegar acá).
  const dictado = usarDictado()
  const segundos = useSegundos(dictado.escuchando)
  const caja = useRef<HTMLTextAreaElement>(null)
  /** se llegó a la caja porque el dictado web no anduvo: el aviso dice "Seguí con el 🎤 del teclado" */
  const [seguir, setSeguir] = useState(false)
  const [avisoPermiso, setAvisoPermiso] = useState(false)
  const [enviado, setEnviado] = useState('')
  const [respuestas, setRespuestas] = useState<string[]>([])
  const [pregunta, setPregunta] = useState<{ pregunta: string; opciones: Opcion[] } | null>(null)
  // ronda 6: lo que propone la IA, para revisar antes de guardar
  const [filas, setFilas] = useState<FilaRevision[]>([])
  const [dudas, setDudas] = useState<DudaRevision[]>([])
  const [guardado, setGuardado] = useState<Linea[]>([])
  const [loteId, setLoteId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [deshecho, setDeshecho] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mientras no se edite, la caja sigue al dictado (pueden llegar los últimos resultados después de terminar).
  const texto = editado ?? dictado.texto

  /** iOS abre el teclado solo si el foco se pide dentro del toque (ver puenteTeclado). */
  const tomarTeclado = () => tomarTecladoYa(caja.current)

  /** Terminar la grabación (dictado web): sigue en el teclado con lo dictado, para corregir o seguir dictando. */
  function terminar() {
    tomarTeclado()
    dictado.terminar()
    setEditado(null)
    setSeguir(false)
    setFase('teclado')
  }

  /** El micrófono grande: la primera vez de la apertura, dictado web; después, el teclado. */
  function tocarMicrofono() {
    if (dictado.escuchando) return terminar()
    setError(null)
    if (dictado.disponible) return dictado.empezar()
    tomarTeclado()
    setSeguir(false)
    setFase('teclado')
  }

  /** "Prefiero escribir": la misma caja. */
  function escribir() {
    tomarTeclado()
    if (dictado.escuchando) dictado.terminar()
    setEditado(null)
    setSeguir(false)
    setFase('teclado')
  }

  /** "Repetir" en el teclado: caja vacía y enfocada, para dictar de nuevo con el 🎤 del teclado. */
  function repetir() {
    caja.current?.focus()
    dictado.borrar()
    setEditado('')
    setError(null)
  }

  /** El dictado web todavía no se usó en esta apertura (p. ej. empezó escribiendo): se puede probar. */
  function usarMicrofono() {
    dictado.borrar()
    setEditado(null)
    setError(null)
    setFase('inicio')
    dictado.empezar()
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
        propuesta?: { acciones?: Accion[]; noEntendi?: string[]; aviso?: string }; pregunta?: string; opciones?: Opcion[]; error?: string
      }
      if (j.propuesta && Array.isArray(j.propuesta.acciones)) {
        const p = j.propuesta
        setFilas((p.acciones ?? []).map((accion, i) => ({ id: `a${i}-${Date.now()}`, accion })))
        // lo que no entendió: por defecto se descarta
        setDudas((Array.isArray(p.noEntendi) ? p.noEntendi : []).map((texto, i) => ({ id: `d${i}-${Date.now()}`, texto, comoNota: false })))
        setAviso(typeof p.aviso === 'string' ? p.aviso : null)
        setFase('propuesta')
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

  /** "Guardar todo": guarda lo revisado; queda "Deshacer" como siempre. */
  async function guardarTodo(acciones: Accion[]) {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/contame/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acciones }),
      })
      const j = (await res.json().catch(() => ({}))) as { guardado?: Linea[]; loteId?: string; error?: string }
      if (res.ok && Array.isArray(j.guardado) && typeof j.loteId === 'string') {
        setGuardado(j.guardado)
        setLoteId(j.loteId)
        setDeshecho(false)
        setFase('listo')
        // lo guardado cambia otras pantallas (Inicio, Pendientes…): que el menú no muestre lo de antes
        router.refresh()
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
    setEditado(null)
    setEnviado('')
    setRespuestas([])
    setPregunta(null)
    setFilas([])
    setDudas([])
    setGuardado([])
    setLoteId(null)
    setAviso(null)
    setDeshecho(false)
    setError(null)
  }

  /** Revisar lo dictado cuando dejó de escuchar solo (silencio largo). */
  function revisar() {
    tomarTeclado()
    setEditado(null)
    setFase('teclado')
  }

  const vista = fase === 'inicio' && !dictado.soportado ? 'teclado' : fase

  // Al entrar al teclado: la caja queda enfocada con el cursor al final (y el campo invisible del toque se va).
  useEffect(() => {
    if (fase !== 'teclado') return
    const c = caja.current
    if (c) {
      c.focus({ preventScroll: true })
      c.setSelectionRange(c.value.length, c.value.length)
    }
    soltarPuente()
  }, [fase])

  // Ronda 12: pedidos del dictado del layout. 'fallo': quedó sordo, dio error o no arrancó (puede pasar antes de
  // llegar a Contame); 'teclado': el micrófono del menú cuando el dictado web ya se usó.
  const { pedidoTeclado, atenderTeclado, escuchando, permiso } = dictado
  useEffect(() => {
    if (!pedidoTeclado) return
    atenderTeclado()
    setEditado(null)
    setSeguir(pedidoTeclado === 'fallo')
    setError(null)
    setFase('teclado')
  }, [pedidoTeclado, atenderTeclado])

  // Empezó a escuchar desde el menú estando en otra parte de Contame: se ve "Te escucho".
  useEffect(() => {
    if (escuchando) setFase('inicio')
  }, [escuchando])

  // Safari pide permiso cada vez: se explica cómo evitarlo, una vez por apertura.
  useEffect(() => {
    if (permiso !== 'prompt' || _avisos.permiso) return
    _avisos.permiso = true
    setAvisoPermiso(true)
  }, [permiso])

  const clasesTitulo = 'text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto'
  return (
    <main className="space-y-4">
      <h1 className={clasesTitulo}>Contame</h1>
      {montado && avisoPermiso && (
        <p className="text-base text-texto-2">Para no tener que dar permiso cada vez: Ajustes → Apps → Safari → Micrófono → Permitir</p>
      )}
      {!montado ? null : (
        <>
          {vista === 'inicio' && (
            <div className="space-y-5">
              {!dictado.escuchando && <p className="text-base text-texto-2">Contame qué pasó y yo lo guardo donde va.</p>}
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={tocarMicrofono}
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

          {vista === 'teclado' && (
            <div className="space-y-4">
              <AvisoTeclado texto={seguir ? 'Seguí con el 🎤 del teclado (abajo a la derecha)' : 'Tocá el 🎤 del teclado (abajo a la derecha) y hablá'} />
              <textarea
                ref={caja}
                aria-label="Lo que querés guardar"
                className={`${clasesInput} min-h-56 py-3 text-[19px] leading-relaxed`}
                maxLength={MAX}
                value={texto}
                onChange={(e) => setEditado(e.target.value)}
              />
              <Boton className="w-full" disabled={cargando || !texto.trim()} onClick={() => enviar(texto.trim(), [])}>Listo</Boton>
              {(texto || dictado.disponible) && (
                <div className="flex flex-wrap justify-center gap-2">
                  {texto && (
                    <button type="button" onClick={repetir} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold text-azul">
                      <Icono nombre="repetir" tamano={18} />Repetir
                    </button>
                  )}
                  {dictado.disponible && (
                    <button type="button" onClick={usarMicrofono} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold text-azul">
                      <Icono nombre="microfono" tamano={18} />Usar el micrófono
                    </button>
                  )}
                </div>
              )}
              {dictado.error && <Alerta>{dictado.error}</Alerta>}
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

          {vista === 'propuesta' && (
            <Revision
              filas={filas} setFilas={setFilas} dudas={dudas} setDudas={setDudas} aviso={aviso} hoy={hoy} cargando={cargando}
              onGuardar={guardarTodo} onCancelar={otraCosa}
            />
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
                </>
              )}
              <div className="flex flex-col gap-3">
                {!deshecho && <Boton variante="suave" className="w-full" disabled={cargando} onClick={deshacer}>Deshacer</Boton>}
                <Boton className="w-full" onClick={otraCosa}>Contar otra cosa</Boton>
              </div>
            </Card>
          )}

          {/* pádel (mockup v2): la pelota rebota contra la pared mientras guarda */}
          {/* ronda 6: primero ordena (la IA) y después, con "Guardar todo", guarda */}
          {cargando && (vista === 'propuesta'
            ? <Padel texto="Guardando" detalle="Lo estoy guardando donde va." />
            : <Padel texto="Ordenando" detalle="Estoy ordenando lo que me contaste." />)}
          {error && <Alerta>{error}</Alerta>}
        </>
      )}
    </main>
  )
}
