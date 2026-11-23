import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-2xl border border-borde bg-white p-4 ${className}`}>{children}</div>
}

export function Chip({ children, activo = false, urgente = false, ...rest }: {
  children: ReactNode; activo?: boolean; urgente?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const color = urgente ? 'bg-urg-bg text-urg-tx' : activo ? 'bg-azul text-white' : 'bg-gris text-texto'
  return (
    <button type="button" {...rest} className={`min-h-11 rounded-full px-4 text-base font-medium ${color}`}>
      {children}
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-medium text-texto">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-texto-2">{hint}</span>}
    </label>
  )
}

export const clasesInput = 'min-h-11 w-full rounded-xl border border-borde bg-white px-3 text-base text-texto'

export function EmptyState({ children, href, accion }: { children: ReactNode; href?: string; accion?: string }) {
  return (
    <div className="rounded-2xl bg-tinte p-4 text-base text-texto-2">
      <p>{children}</p>
      {href && accion && (
        <Link href={href} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-azul px-4 font-medium text-white hover:bg-azul-osc">
          {accion}
        </Link>
      )}
    </div>
  )
}

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'suave' }
export function Boton({ variante = 'primario', className = '', ...rest }: PropsBoton) {
  const color = variante === 'primario' ? 'bg-azul text-white hover:bg-azul-osc' : 'bg-gris text-texto'
  return <button type="button" {...rest} className={`min-h-11 rounded-xl px-5 text-base font-semibold ${color} ${className}`} />
}

/** Hoja inferior simple. Se cierra con el botón "Cerrar" o tocando afuera. */
export function Sheet({ abierto, onCerrar, titulo, children }: {
  abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode
}) {
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onCerrar}>
      <div
        role="dialog" aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <Boton variante="suave" onClick={onCerrar}>Cerrar</Boton>
        </div>
        {children}
      </div>
    </div>
  )
}
