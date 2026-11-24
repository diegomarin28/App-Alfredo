'use client'
import './globals.css'

/** Último recurso: falló hasta el layout raíz. Arma su propio <html>. */
export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-10">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">Algo salió mal</h1>
          <p className="text-base text-texto-2">Probá de nuevo; si sigue pasando, avisale a Diego.</p>
          <button type="button" onClick={() => reset()} className="min-h-12 w-full rounded-xl bg-azul px-5 text-base font-semibold text-white hover:bg-azul-osc">
            Probá de nuevo
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sin router: recarga completa */}
          <a href="/" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-gris px-5 text-base font-semibold text-texto">
            Volver al inicio
          </a>
        </main>
      </body>
    </html>
  )
}
