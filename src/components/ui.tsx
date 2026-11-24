import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { Icono, type NombreIcono } from './iconos'

export { Sheet } from './Hoja'

/** Tarjeta blanca del mockup v2 (radio 16, borde fino). */
export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-2xl border border-borde bg-white px-4 py-3.5 ${className}`}>{children}</div>
}

/** Filtro de una sola línea (grupos de contactos): azul cuando está elegido. */
export function Chip({ children, activo = false, urgente = false, className = '', ...rest }: {
  children: ReactNode; activo?: boolean; urgente?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const color = urgente
    ? 'border-transparent bg-urg-bg text-urg-tx'
    : activo ? 'border-azul bg-azul text-white' : 'border-borde bg-white text-texto'
  return (
    <button type="button" {...rest} className={`min-h-11 shrink-0 rounded-full border px-4 text-base font-semibold ${color} ${className}`}>
      {children}
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-semibold text-texto">{label}</span>
      {hint && <span className="mb-2 block text-base text-texto-2">{hint}</span>}
      {children}
    </label>
  )
}

/**
 * Como Field, pero el título nombra al control con aria-labelledby: para selects, así el texto de sus opciones
 * ("Todos los meses", "1 mes") no se mezcla con el nombre.
 */
export function CampoSelect({ id, label, children }: { id: string; label: string; children: (props: { 'aria-labelledby': string; id: string }) => ReactNode }) {
  return (
    <div>
      <span id={`${id}-titulo`} className="mb-1.5 block text-base font-semibold text-texto">{label}</span>
      {children({ 'aria-labelledby': `${id}-titulo`, id })}
    </div>
  )
}

export const clasesInput = 'min-h-12 w-full rounded-xl border border-borde bg-white px-4 text-base text-texto placeholder:text-texto-2 focus:border-azul focus:outline-none focus:ring-2 focus:ring-tinte'

/** Select con la flechita del mockup v2. */
export const clasesSelect = `${clasesInput} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%235F646B' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")] bg-[length:20px] bg-[right_14px_center] bg-no-repeat pr-10`

export function EmptyState({ children, href, accion }: { children: ReactNode; href?: string; accion?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-borde-fuerte bg-white/60 p-4 text-base text-texto-2">
      <p>{children}</p>
      {href && accion && (
        <Link href={href} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-azul px-4 font-semibold text-white hover:bg-azul-osc">
          {accion}
        </Link>
      )}
    </div>
  )
}

const VARIANTES = {
  primario: 'bg-azul text-white hover:bg-azul-osc',
  suave: 'bg-tinte text-azul',
  gris: 'bg-gris text-texto',
  blanco: 'bg-white text-azul',
  peligro: 'bg-rojo-bg text-rojo',
} as const

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof VARIANTES }
/** Botón de 48 px de alto (mínimo 44 de toque). */
export function Boton({ variante = 'primario', className = '', ...rest }: PropsBoton) {
  return (
    <button
      type="button" {...rest}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
    />
  )
}

/** "+" redondo azul de 44 px a la derecha del título (mockup v2). El nombre va en aria-label. */
export function BotonMas({ nombre, className = '', ...rest }: { nombre: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" {...rest} aria-label={nombre}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-azul text-white shadow-[0_6px_16px_rgba(31,78,140,0.28)] hover:bg-azul-osc ${className}`}
    >
      <Icono nombre="mas" tamano={22} trazo={2.2} />
    </button>
  )
}

/** Compatibilidad: el "+" de la cabecera (antes un botón con texto). */
export const BotonAgregar = BotonMas

/** Dentro de una sección: link azul "+ Agregar" (o el texto que se pase). */
export function LinkAgregar({ children = 'Agregar', nombre, className = '', ...rest }: {
  children?: ReactNode; nombre?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" {...rest} aria-label={nombre}
      className={`-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-semibold text-azul ${className}`}
    >
      <Icono nombre="mas" tamano={18} trazo={2.2} />{children}
    </button>
  )
}

/** Título de la pantalla (30 px) con su acción a la derecha (el "+"). */
export function Titulo({ children, accion, className = '' }: { children: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <header className={`flex items-center justify-between gap-3 ${className}`}>
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.6px] text-texto">{children}</h1>
      {accion}
    </header>
  )
}

/** Encabezado de sección (17 px) con acción opcional ("+ Agregar"). */
export function Seccion({ titulo, id, accion, children, className = '', sinTitulo = false }: {
  titulo: string; id: string; accion?: ReactNode; children: ReactNode; className?: string
  /** oculta el encabezado (sigue nombrando la sección para lectores de pantalla) */
  sinTitulo?: boolean
}) {
  return (
    <section aria-labelledby={id} className={`space-y-2.5 ${className}`}>
      <div className={`flex min-h-11 items-center justify-between gap-3 ${sinTitulo ? 'sr-only' : ''}`}>
        <h2 id={id} className="text-[17px] font-bold text-texto">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

/** Lista en una sola tarjeta blanca con separadores finos (mockup v2). Cada hijo es un <li data-fila>. */
export function Lista({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul {...rest} className={`overflow-hidden rounded-2xl border border-borde bg-white ${className}`}>
      {children}
    </ul>
  )
}

/** Separador fino entre filas de una Lista (menos arriba de la primera). */
export const clasesSeparador = 'border-borde [&:not(:first-child)]:border-t'
/** Fila de una Lista: separador, ícono/avatar, textos y acciones. */
export const clasesFila = `flex min-h-16 items-center gap-3 px-4 py-2.5 ${clasesSeparador}`

/** Cuadradito de color con un ícono (accesos, filas de listas). */
const TONOS_TILE = {
  azul: 'bg-tinte text-azul',
  naranja: 'bg-urg-bg text-urg-tx',
  verde: 'bg-verde-bg text-verde',
  gris: 'bg-gris text-texto-2',
} as const
export function IconoTile({ nombre, tono = 'azul', tamano = 40 }: { nombre: NombreIcono; tono?: keyof typeof TONOS_TILE; tamano?: number }) {
  return (
    <span aria-hidden="true" style={{ width: tamano, height: tamano }} className={`flex shrink-0 items-center justify-center rounded-xl ${TONOS_TILE[tono]}`}>
      <Icono nombre={nombre} tamano={Math.round(tamano * 0.5)} />
    </span>
  )
}

/** Iniciales en un círculo de 44 px (contactos, personas de las casas). */
export function Avatar({ nombre, tono = 'azul' }: { nombre: string; tono?: 'azul' | 'verde' }) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  const iniciales = (palabras.length > 1 ? palabras[0][0] + palabras[palabras.length - 1][0] : (palabras[0] ?? '?')[0]).toUpperCase()
  const color = tono === 'verde' ? 'bg-verde-bg text-verde' : 'bg-tinte text-azul'
  return <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${color}`}>{iniciales}</span>
}

/** Etiqueta de estado: roja si venció, naranja si es pronto, gris si falta. */
export function Pill({ children, tono = 'gris' }: { children: ReactNode; tono?: 'rojo' | 'naranja' | 'gris' }) {
  const color = tono === 'rojo' ? 'bg-rojo-bg text-rojo' : tono === 'naranja' ? 'bg-urg-bg text-urg-tx' : 'bg-gris text-texto-2'
  return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-base font-semibold ${color}`}>{children}</span>
}

/** Volver, arriba del título: "‹ Documentos" (la flecha apunta a la izquierda). */
export function Volver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-1 text-base font-semibold text-azul">
      <Icono nombre="atras" tamano={16} trazo={2} />{children}
    </Link>
  )
}

/** Botón redondo con ícono (llamar, copiar): 44 px, fondo suave. */
export function BotonIcono({ nombre, icono, tono = 'azul', href, onClick, externo = false }: {
  nombre: string; icono: NombreIcono; tono?: 'azul' | 'verde' | 'nada' | 'rojo'
  href?: string; onClick?: () => void; externo?: boolean
}) {
  const color = { azul: 'bg-tinte text-azul', verde: 'bg-verde-bg text-verde', nada: 'text-texto-2', rojo: 'text-rojo' }[tono]
  const clases = `flex size-11 shrink-0 items-center justify-center rounded-full ${color}`
  if (href) {
    return (
      <a href={href} aria-label={nombre} className={clases} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        <Icono nombre={icono} tamano={20} />
      </a>
    )
  }
  return <button type="button" aria-label={nombre} onClick={onClick} className={clases}><Icono nombre={icono} tamano={20} /></button>
}
