'use client'
import { useState, useSyncExternalStore } from 'react'
import { borrarRegistro, horaMs, leerRegistro, leerRegistroServidor, registroComoTexto, suscribirRegistro } from '@/voz/registro'

/** Copia con el portapapeles; si no se puede (permiso, navegador viejo), con una selección. */
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const caja = document.createElement('textarea')
    caja.value = texto
    caja.setAttribute('readonly', '')
    caja.style.position = 'fixed'
    caja.style.opacity = '0'
    document.body.appendChild(caja)
    caja.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    caja.remove()
    return ok
  }
}

/** Ronda 9, temporal: los eventos del reconocedor de voz con la hora en milisegundos, para copiarlos. */
export default function RegistroDictado() {
  const eventos = useSyncExternalStore(suscribirRegistro, leerRegistro, leerRegistroServidor)
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)

  if (!abierto) {
    return (
      <div className="flex justify-center pt-4">
        <button type="button" onClick={() => setAbierto(true)} className="min-h-11 rounded-xl px-3 text-base font-semibold text-texto-2">
          Ver registro
        </button>
      </div>
    )
  }
  return (
    <section aria-label="Registro del micrófono" className="space-y-3 rounded-2xl border border-borde p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl bg-tinte px-3 text-base font-semibold text-azul"
          onClick={async () => setCopiado((await copiar(registroComoTexto(eventos))) ? 'si' : 'no')}
        >
          Copiar registro
        </button>
        <button type="button" className="min-h-11 rounded-xl px-3 text-base font-semibold text-texto-2" onClick={() => { borrarRegistro(); setCopiado(null) }}>
          Vaciar
        </button>
        <button type="button" className="min-h-11 rounded-xl px-3 text-base font-semibold text-texto-2" onClick={() => setAbierto(false)}>
          Cerrar
        </button>
        {copiado && <span role="status" className="text-base text-texto-2">{copiado === 'si' ? 'Copiado' : 'No pude copiarlo: seleccionalo y copialo a mano'}</span>}
      </div>
      <pre data-testid="registro-dictado" className="max-h-80 overflow-y-auto whitespace-pre-wrap break-all font-mono text-base leading-snug text-texto select-text">
        {eventos.length ? eventos.map((e) => `${horaMs(e.t)} ${e.n ? `#${e.n}` : '--'} ${e.ev}`).join('\n') : 'Todavía no hay eventos.'}
      </pre>
    </section>
  )
}
