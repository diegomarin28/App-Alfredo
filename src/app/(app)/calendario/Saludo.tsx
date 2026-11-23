'use client'
import { useState } from 'react'
import { waLink } from '@/domain/telefono'
import { saludos, type Tono } from '@/domain/saludos'
import { Boton, Chip, clasesInput } from '@/components/ui'
import { useTextoEscrito } from '@/components/useTextoEscrito'

const TONOS: [Tono, string][] = [['calido', 'Cálido'], ['formal', 'Formal'], ['corto', 'Corto']]

export default function Saludo({ nombre }: { nombre: string }) {
  const [tono, setTono] = useState<Tono>('calido')
  const [texto, setTexto, campo] = useTextoEscrito(saludos(nombre).calido)
  const [copiado, setCopiado] = useState(false)

  function elegir(t: Tono) {
    setTono(t)
    setTexto(saludos(nombre)[t])
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* sin permiso de portapapeles: no hacemos nada */ }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tono del saludo">
        {TONOS.map(([t, label]) => (
          <Chip key={t} activo={tono === t} aria-pressed={tono === t} onClick={() => elegir(t)}>{label}</Chip>
        ))}
      </div>
      <textarea
        {...campo} aria-label="Saludo" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
        className={`${clasesInput} py-2`}
      />
      <div className="flex flex-wrap gap-3">
        <a href={waLink(texto)} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl bg-azul px-5 text-base font-semibold text-white hover:bg-azul-osc">
          Enviar por WhatsApp
        </a>
        <Boton variante="suave" onClick={copiar}>Copiar</Boton>
        <span role="status" className="self-center text-base text-texto-2">{copiado ? 'Copiado' : ''}</span>
      </div>
    </div>
  )
}
