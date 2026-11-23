'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { Boton } from '@/components/ui'

/** Error dentro de la app: mensaje amable, reintentar o volver al Inicio (nunca el detalle técnico). */
export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <main className="flex flex-col gap-5 py-10">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-texto">Algo salió mal</h1>
      <p className="text-base text-texto-2">No es culpa tuya. Probá de nuevo en un ratito; si sigue pasando, avisale a Diego.</p>
      <div className="flex flex-col gap-3">
        <Boton className="min-h-12 w-full" onClick={() => reset()}>Probá de nuevo</Boton>
        <Link href="/" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gris px-5 text-base font-semibold text-texto">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
