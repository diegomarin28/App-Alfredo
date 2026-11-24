'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton } from '@/components/ui'
import { Icono, type NombreIcono } from '@/components/iconos'
import { marcarBienvenida } from '@/app/(app)/ajustes/actions'

/** Los 7 pasos de la Guía (mockup v2). */
export const PASOS: [NombreIcono, string, string][] = [
  ['inicio', 'Todo arranca acá', 'Cada día ves una foto de la familia, lo que se viene y accesos rápidos a todo.'],
  ['microfono', 'Contame y yo lo guardo', 'Tocá el micrófono y hablá: un pago, un arreglo, algo para acordarte. La app lo guarda donde va.'],
  ['torta', 'Cumpleaños y saludos', 'El día del cumple te aparece el saludo listo para mandar por WhatsApp.'],
  ['campana', 'Recordatorios con aviso', 'Navidad, fin de año, pasajes de los chicos: te avisa con tiempo, todos los años.'],
  ['mensaje', 'Te ayudo a contestar', 'Pegá un mensaje que te mandaron y te sugiero una respuesta con tu forma de escribir.'],
  ['casa', 'Portofino y Malibú', 'Quién se ocupa de cada casa, los servicios y todo lo que se hizo.'],
  ['candado', 'Documentos y contraseñas', 'Fotos de tus papeles por carpeta, y tus claves guardadas con Face ID.'],
]

/** Guía de primera vez: Atrás / Siguiente / Saltar / Empezar. Al terminar no se muestra más sola. */
export default function Guia() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [saliendo, setSaliendo] = useState(false)
  const ultimo = paso === PASOS.length - 1
  const [icono, titulo, texto] = PASOS[paso]

  async function terminar() {
    setSaliendo(true)
    await marcarBienvenida(true).catch(() => null)
    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-dvh flex-col bg-fondo px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex justify-end">
        <button type="button" onClick={terminar} disabled={saliendo} className="min-h-11 rounded-xl px-3 text-base font-semibold text-texto-2">Saltar</button>
      </div>
      <section aria-live="polite" aria-label={`Paso ${paso + 1} de ${PASOS.length}`} className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 text-center">
        <span aria-hidden="true" key={paso} className="flex size-[168px] items-center justify-center rounded-full bg-tinte motion-safe:animate-entrar">
          <span className="flex size-28 items-center justify-center rounded-full bg-azul text-white"><Icono nombre={icono} tamano={44} trazo={2} /></span>
        </span>
        <div aria-hidden="true" className="flex gap-1.5">
          {PASOS.map((_, i) => <span key={i} className={`h-2 rounded-full ${i === paso ? 'w-6 bg-azul' : 'w-2 bg-borde-fuerte'}`} />)}
        </div>
        <div className="space-y-3">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">{titulo}</h1>
          <p className="text-[17px] leading-relaxed text-texto-2">{texto}</p>
        </div>
      </section>
      <div className="mx-auto grid w-full max-w-md grid-cols-[auto_1fr] gap-3">
        <Boton variante="suave" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)} className="px-6">Atrás</Boton>
        {ultimo
          ? <Boton disabled={saliendo} onClick={terminar}>Empezar</Boton>
          : <Boton onClick={() => setPaso((p) => p + 1)}>Siguiente</Boton>}
      </div>
    </main>
  )
}
