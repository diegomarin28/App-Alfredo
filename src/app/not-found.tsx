import Link from 'next/link'

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">No encontramos esa página</h1>
      <p className="text-base text-texto-2">Puede que la hayan borrado o que el link esté mal.</p>
      <Link href="/" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-azul px-5 text-base font-semibold text-white hover:bg-azul-osc">
        Volver al inicio
      </Link>
    </main>
  )
}
