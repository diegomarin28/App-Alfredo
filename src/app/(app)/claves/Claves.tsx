'use client'
import { Icono } from '@/components/iconos'
/**
 * Contraseñas. La clave vive solo en memoria de esta pantalla (un ref): nunca se guarda, se manda ni se registra.
 * Al servidor solo van { sitio, usuario, cifrado, iv } y la configuración (sal, modo, control "ok" cifrado).
 * Se bloquea al ocultar la app, al salir de la pantalla y a los 2 minutos sin tocar nada.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Boton, Card, Field, clasesInput } from '@/components/ui'
import { aBase64, cifrar, deBase64, derivarClavePin, derivarClavePrf, descifrar } from '@/claves/cripto'

interface Item { id: string; sitio: string; usuario?: string; cifrado: string; iv: string }
interface ConfigClaves { claveSalt?: string; claveModo?: 'prf' | 'pin'; claveCheck?: string; claveCheckIv?: string }

type Paso =
  | { t: 'bloqueada' }
  | { t: 'esperando' }
  | { t: 'elegirPin'; salt: Uint8Array }
  | { t: 'repetirPin'; salt: Uint8Array; primero: string }
  | { t: 'pedirPin'; salt: Uint8Array; config: ConfigClaves }
  | { t: 'abierta' }

const INACTIVIDAD_MS = 120_000
const ENMASCARADA = '••••••••'
const PIN_VALIDO = /^\d{6}$/

/** Error con un mensaje para mostrarle a Alfredo tal cual. */
class Aviso extends Error {}
const mensajeDe = (e: unknown) => (e instanceof Aviso ? e.message : 'No se pudo abrir. Probá de nuevo.')

/** Face ID (WebAuthn get con PRF). No lo verifica el servidor: ya hay sesión de owner; es la puerta local. */
async function pedirFaceId(salt: Uint8Array): Promise<ArrayBuffer | undefined> {
  const opciones = {
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: process.env.NEXT_PUBLIC_RP_ID || location.hostname,
      userVerification: 'required',
      allowCredentials: [],
      timeout: 60_000,
      extensions: { prf: { eval: { first: new Uint8Array(salt) } } },
    },
  } as CredentialRequestOptions
  const cred = (await navigator.credentials.get(opciones)) as PublicKeyCredential | null
  if (!cred) throw new Error('sin credencial')
  const ext = cred.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer | ArrayBufferView } } }
  const first = ext.prf?.results?.first
  if (!first) return undefined
  const u = first instanceof ArrayBuffer ? new Uint8Array(first) : new Uint8Array(first.buffer, first.byteOffset, first.byteLength)
  return new Uint8Array(u).buffer
}

async function controlOk(key: CryptoKey, c: ConfigClaves): Promise<boolean> {
  if (!c.claveCheck || !c.claveCheckIv) return false
  try {
    return (await descifrar(key, { cifrado: c.claveCheck, iv: c.claveCheckIv })) === 'ok'
  } catch {
    return false
  }
}

export default function Claves() {
  const [paso, setPaso] = useState<Paso>({ t: 'bloqueada' })
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [visibles, setVisibles] = useState<Record<string, string>>({})
  const [copiada, setCopiada] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<string | null>(null)
  const clave = useRef<CryptoKey | null>(null)
  /** Cada bloqueo invalida lo que estaba en curso (un Face ID o un PIN que termina tarde no abre nada). */
  const generacion = useRef(0)
  /** Solo durante navigator.credentials.get: el cartel de Face ID no debe cortar el desbloqueo. */
  const faceIdEnCurso = useRef(false)

  const bloquear = useCallback(() => {
    generacion.current++
    clave.current = null
    setItems([])
    setVisibles({})
    setCopiada(null)
    setABorrar(null)
    setPin('')
    setOcupado(false)
    setPaso({ t: 'bloqueada' })
  }, [])

  // Al salir de la pantalla (cambio de ruta / desmontar) se suelta la clave.
  useEffect(() => () => {
    generacion.current++
    clave.current = null
  }, [])

  // Al ocultar la app. Solo se exceptúa el instante del cartel de Face ID; si la app sigue oculta
  // cuando la clave está lista, abrir() bloquea igual.
  useEffect(() => {
    const alCambiar = () => {
      if (document.visibilityState === 'hidden' && !faceIdEnCurso.current) bloquear()
    }
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [bloquear])

  // A los 2 minutos sin tocar nada (cualquier toque o tecla reinicia la cuenta).
  const activa = paso.t !== 'bloqueada' && paso.t !== 'esperando'
  useEffect(() => {
    if (!activa) return
    let timer = setTimeout(bloquear, INACTIVIDAD_MS)
    const reiniciar = () => {
      clearTimeout(timer)
      timer = setTimeout(bloquear, INACTIVIDAD_MS)
    }
    const eventos = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const e of eventos) document.addEventListener(e, reiniciar, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const e of eventos) document.removeEventListener(e, reiniciar)
    }
  }, [activa, bloquear])

  function fallar(mensaje: string, g: number) {
    if (g !== generacion.current) return
    setError(mensaje)
    setOcupado(false)
    setPin('')
    setPaso({ t: 'bloqueada' })
  }

  async function abrir(key: CryptoKey, g: number) {
    const res = await fetch('/api/claves', { cache: 'no-store' })
    if (!res.ok) throw new Error('lista')
    const lista = (await res.json()) as Item[]
    if (g !== generacion.current) return
    // Nunca abrir con la app en segundo plano (iOS frena los timers: no se volvería a bloquear).
    if (document.visibilityState === 'hidden') return bloquear()
    clave.current = key
    setItems(lista)
    setError('')
    setPin('')
    setOcupado(false)
    setPaso({ t: 'abierta' })
  }

  /** Primera vez: guarda sal, modo y el control "ok" cifrado. El servidor lo acepta una sola vez. */
  async function guardarConfig(modo: 'prf' | 'pin', salt: Uint8Array, key: CryptoKey) {
    const control = await cifrar(key, 'ok')
    const res = await fetch('/api/claves/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claveSalt: aBase64(salt), claveModo: modo, claveCheck: control.cifrado, claveCheckIv: control.iv }),
    })
    if (res.status === 409) throw new Aviso('Las contraseñas ya estaban configuradas. Probá de nuevo.')
    if (!res.ok) throw new Error('config')
  }

  async function desbloquear() {
    const g = ++generacion.current
    setError('')
    setOcupado(true)
    setPaso({ t: 'esperando' })
    try {
      const res = await fetch('/api/claves/config', { cache: 'no-store' })
      if (!res.ok) throw new Error('config')
      const config = (await res.json()) as ConfigClaves
      const nueva = !config.claveModo
      if (!nueva && !config.claveSalt) throw new Error('config')
      const salt = nueva ? crypto.getRandomValues(new Uint8Array(32)) : deBase64(config.claveSalt!)

      let prf: ArrayBuffer | undefined
      faceIdEnCurso.current = true
      try {
        prf = await pedirFaceId(salt)
      } catch {
        return fallar('No se pudo usar Face ID. Probá de nuevo.', g)
      } finally {
        faceIdEnCurso.current = false
      }
      if (g !== generacion.current) return

      if (nueva) {
        if (!prf) {
          setOcupado(false)
          setPaso({ t: 'elegirPin', salt })
          return
        }
        const key = await derivarClavePrf(prf, salt)
        await guardarConfig('prf', salt, key)
        return await abrir(key, g)
      }
      if (config.claveModo === 'prf') {
        if (!prf) return fallar('Este celular no puede abrir las contraseñas con Face ID.', g)
        const key = await derivarClavePrf(prf, salt)
        if (!(await controlOk(key, config))) return fallar('No se pudieron abrir las contraseñas con este Face ID.', g)
        return await abrir(key, g)
      }
      setOcupado(false)
      setPaso({ t: 'pedirPin', salt, config })
    } catch (e) {
      fallar(mensajeDe(e), g)
    }
  }

  async function enviarPin(e: FormEvent) {
    e.preventDefault()
    const p = paso
    if (p.t !== 'elegirPin' && p.t !== 'repetirPin' && p.t !== 'pedirPin') return
    if (!PIN_VALIDO.test(pin)) {
      setError('El PIN tiene que tener 6 números.')
      return
    }
    setError('')
    if (p.t === 'elegirPin') {
      setPaso({ t: 'repetirPin', salt: p.salt, primero: pin })
      setPin('')
      return
    }
    if (p.t === 'repetirPin' && pin !== p.primero) {
      setError('Los PIN no coinciden. Probá de nuevo.')
      setPin('')
      setPaso({ t: 'elegirPin', salt: p.salt })
      return
    }
    const g = generacion.current
    setOcupado(true)
    try {
      const key = await derivarClavePin(pin, p.salt)
      if (g !== generacion.current) return
      if (document.visibilityState === 'hidden') return bloquear()
      if (p.t === 'repetirPin') {
        await guardarConfig('pin', p.salt, key)
        return await abrir(key, g)
      }
      if (!(await controlOk(key, p.config))) {
        if (g !== generacion.current) return
        setError('PIN incorrecto')
        setPin('')
        setOcupado(false)
        return
      }
      await abrir(key, g)
    } catch (e) {
      fallar(mensajeDe(e), g)
    }
  }

  async function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const key = clave.current
    if (!key) return
    const form = e.currentTarget
    const f = new FormData(form)
    const sitio = String(f.get('sitio') ?? '').trim()
    const usuario = String(f.get('usuario') ?? '').trim()
    const texto = String(f.get('clave') ?? '')
    if (!sitio) return setError('Escribí el sitio.')
    if (!texto) return setError('Escribí la contraseña.')
    setError('')
    setOcupado(true)
    const g = generacion.current
    try {
      const { cifrado, iv } = await cifrar(key, texto)
      const res = await fetch('/api/claves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitio, usuario: usuario || undefined, cifrado, iv }),
      })
      const datos = await res.json().catch(() => ({}))
      if (g !== generacion.current) return
      if (!res.ok) {
        setError(typeof datos.error === 'string' ? datos.error : 'No se pudo guardar. Probá de nuevo.')
        return
      }
      setItems((l) => [...l, datos as Item])
      form.reset()
    } catch {
      if (g === generacion.current) setError('No se pudo guardar. Probá de nuevo.')
    } finally {
      if (g === generacion.current) setOcupado(false)
    }
  }

  /** Descifra; null si se bloqueó mientras tanto (el texto se descarta, no llega al estado ni al portapapeles). */
  async function textoDe(item: Item): Promise<string | null> {
    const g = generacion.current
    if (!clave.current) return null
    const texto = await descifrar(clave.current, item)
    return g === generacion.current ? texto : null
  }

  async function copiar(item: Item) {
    setError('')
    try {
      const texto = await textoDe(item)
      if (texto === null) return
      await navigator.clipboard.writeText(texto)
      setCopiada(item.id)
      setTimeout(() => setCopiada((c) => (c === item.id ? null : c)), 2000)
    } catch {
      setError('No se pudo copiar. Probá de nuevo.')
    }
  }

  async function mostrar(item: Item) {
    if (visibles[item.id] !== undefined) {
      setVisibles(({ [item.id]: _, ...resto }) => resto)
      return
    }
    try {
      const texto = await textoDe(item)
      if (texto === null) return
      setVisibles((v) => ({ ...v, [item.id]: texto }))
    } catch {
      setError('No se pudo mostrar. Probá de nuevo.')
    }
  }

  async function borrar(item: Item) {
    setError('')
    setABorrar(null)
    const res = await fetch(`/api/claves?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) return setError('No se pudo borrar. Probá de nuevo.')
    setItems((l) => l.filter((i) => i.id !== item.id))
    setVisibles(({ [item.id]: _, ...resto }) => resto)
  }

  const alerta = error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>

  return (
    <main className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">Contraseñas</h1>
        {paso.t === 'abierta' && <Boton variante="suave" onClick={bloquear}>Bloquear</Boton>}
      </header>

      {(paso.t === 'bloqueada' || paso.t === 'esperando') && (
        <div className="flex flex-col items-center gap-5 pt-6 text-center">
          {/* ronda 3: candado grande arriba y un texto corto */}
          <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-full bg-tinte text-azul">
            <Icono nombre="candado" tamano={44} trazo={2} />
          </span>
          <p className="max-w-xs text-[17px] text-texto">Solo se abren con tu Face ID. Se cierran solas a los 2 minutos.</p>
          {alerta}
          <button
            type="button"
            onClick={desbloquear}
            disabled={ocupado}
            className="min-h-14 w-full rounded-2xl bg-azul px-6 text-lg font-semibold text-white hover:bg-azul-osc disabled:opacity-60"
          >
            Desbloquear con Face ID
          </button>
        </div>
      )}

      {(paso.t === 'elegirPin' || paso.t === 'repetirPin' || paso.t === 'pedirPin') && (
        <Card>
          <form onSubmit={enviarPin} className="space-y-4">
            {paso.t === 'elegirPin' && (
              <p className="text-base text-texto-2">Este celular no puede usar solo Face ID para las contraseñas. Elegí un PIN para abrirlas.</p>
            )}
            <Field
              key={paso.t}
              label={paso.t === 'elegirPin' ? 'Elegí un PIN de 6 números' : paso.t === 'repetirPin' ? 'Repetilo' : 'Escribí tu PIN'}
            >
              <input
                type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="off" autoFocus
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${clasesInput} tracking-[0.5em]`}
              />
            </Field>
            {alerta}
            <div className="flex gap-3">
              <Boton type="submit" disabled={ocupado}>
                {ocupado ? 'Abriendo…' : paso.t === 'elegirPin' ? 'Seguir' : paso.t === 'repetirPin' ? 'Guardar PIN' : 'Abrir'}
              </Boton>
              <Boton variante="suave" onClick={bloquear}>Cancelar</Boton>
            </div>
          </form>
        </Card>
      )}

      {paso.t === 'abierta' && (
        <>
          {alerta}
          {items.length === 0 ? (
            <p className="rounded-2xl bg-tinte p-4 text-base text-texto-2">Todavía no guardaste ninguna contraseña. Agregá la primera abajo.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id}>
                  <Card className="space-y-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-lg font-semibold break-words">{i.sitio}</p>
                      {i.usuario && <p className="text-base text-texto-2 break-words">{i.usuario}</p>}
                      <p className="font-mono text-base break-all">{visibles[i.id] ?? ENMASCARADA}</p>
                    </div>
                    {aBorrar === i.id ? (
                      <div className="space-y-2">
                        <p className="text-base">¿Borrar la contraseña de {i.sitio}?</p>
                        <div className="flex flex-wrap gap-2">
                          <Boton onClick={() => borrar(i)}>Sí, borrar</Boton>
                          <Boton variante="suave" onClick={() => setABorrar(null)}>No</Boton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Boton onClick={() => copiar(i)}>{copiada === i.id ? 'Copiada' : 'Copiar'}</Boton>
                        <Boton variante="suave" onClick={() => mostrar(i)}>{visibles[i.id] !== undefined ? 'Ocultar' : 'Mostrar'}</Boton>
                        <Boton variante="suave" onClick={() => setABorrar(i.id)}>Borrar</Boton>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="agregar">
            <Card>
              <form onSubmit={agregar} className="space-y-4" autoComplete="off">
                <h2 id="agregar" className="text-xl font-semibold">Agregar contraseña</h2>
                <Field label="Sitio" hint="Por ejemplo Gmail">
                  <input name="sitio" maxLength={80} required className={clasesInput} autoComplete="off" />
                </Field>
                <Field label="Usuario" hint="Opcional">
                  <input name="usuario" maxLength={120} className={clasesInput} autoComplete="off" autoCapitalize="none" />
                </Field>
                <Field label="Contraseña">
                  <input name="clave" type="password" required maxLength={1000} className={clasesInput} autoComplete="off" />
                </Field>
                <Boton type="submit" disabled={ocupado}>Guardar contraseña</Boton>
              </form>
            </Card>
          </section>
        </>
      )}
    </main>
  )
}
