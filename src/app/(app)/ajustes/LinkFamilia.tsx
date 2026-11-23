'use client'
import { useState } from 'react'
import { Boton } from '@/components/ui'
import { waLink } from '@/domain/telefono'

export default function LinkFamilia({ url, vigencia }: { url: string; vigencia: string | null }) {
  const [copiado, setCopiado] = useState(false)
  const texto = `Te paso el link para entrar a la app de la familia: ${url}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* sin permiso de portapapeles */ }
  }

  return (
    <div className="space-y-3">
      <p className="break-all rounded-xl bg-tinte p-3 text-base text-texto">{url}</p>
      {vigencia && <p className="text-base text-texto-2">Vale hasta el {vigencia}.</p>}
      <div className="flex flex-wrap gap-3">
        <Boton onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</Boton>
        <a href={waLink(texto)} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl bg-gris px-5 text-base font-semibold text-texto">
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  )
}
