'use client'
import { useState } from 'react'
import { waLink } from '@/domain/telefono'
import { saludos, TONOS, type Tono } from '@/domain/saludos'
import { Boton, Sheet, clasesInput } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import { Icono } from '@/components/iconos'

/**
 * "Mandar saludo" (mockup v2): solo el día del cumpleaños. Abre una hoja con el saludo en tres tonos
 * (Formal por defecto), editable, para mandar por WhatsApp o copiar.
 */
export default function Saludo({ nombre, firma }: { nombre: string; firma: string }) {
  const [abierto, setAbierto] = useState(false)
  const [tono, setTono] = useState<Tono>('formal')
  const [texto, setTexto] = useState(saludos(nombre, firma).formal)
  const [copiado, setCopiado] = useState(false)

  function elegir(t: Tono) {
    setTono(t)
    setTexto(saludos(nombre, firma)[t])
    setCopiado(false)
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* sin permiso de portapapeles: no hacemos nada */ }
  }

  return (
    <>
      <button
        type="button" onClick={() => setAbierto(true)}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/90 text-base font-semibold text-azul"
      >
        <Icono nombre="whatsapp" tamano={20} />Mandar saludo
      </button>
      <Sheet abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Saludo para ${nombre}`}>
        <div className="space-y-3">
          <Segmentado etiqueta="Tono del saludo" opciones={TONOS} valor={tono} onCambio={elegir} />
          <textarea
            aria-label="Saludo" rows={4} value={texto} onChange={(e) => { setTexto(e.target.value); setCopiado(false) }}
            className={`${clasesInput} bg-fondo py-3 leading-snug`}
          />
          <div className="grid grid-cols-2 gap-3">
            <a
              href={waLink(texto)} target="_blank" rel="noopener noreferrer" aria-label="Enviar por WhatsApp"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-azul text-base font-semibold whitespace-nowrap text-white hover:bg-azul-osc"
            >
              <Icono nombre="whatsapp" tamano={20} />WhatsApp
            </a>
            <Boton variante="suave" onClick={copiar}><Icono nombre="copiar" tamano={20} />{copiado ? 'Copiado' : 'Copiar'}</Boton>
          </div>
          <p className="text-base text-texto-2">WhatsApp se abre para que elijas a quién mandarlo.</p>
        </div>
      </Sheet>
    </>
  )
}
