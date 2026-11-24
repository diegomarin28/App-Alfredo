'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Rol } from '@/auth/access'
import { Icono, type NombreIcono } from './iconos'

export type Tab = 'inicio' | 'calendario' | 'contame' | 'mensajes' | 'casas' | 'fotos'

const RUTAS: Record<Tab, string> = {
  inicio: '/', calendario: '/calendario', contame: '/contame', mensajes: '/mensajes', casas: '/casas', fotos: '/fotos',
}

function tabDe(path: string | null): Tab | null {
  if (!path) return null
  if (path === '/') return 'inicio'
  return (Object.keys(RUTAS) as Tab[]).find((t) => t !== 'inicio' && (path === RUTAS[t] || path.startsWith(RUTAS[t] + '/'))) ?? null
}

const ICONOS: Record<Exclude<Tab, 'contame'>, NombreIcono> = {
  inicio: 'inicio', calendario: 'calendario', mensajes: 'mensaje', casas: 'casa', fotos: 'imagen',
}

// Teléfono (mockup v2): íconos de 24 px y etiquetas de 14 px, toques de 48 px. En lg, barra lateral con 16 px.
function Pestana({ tab, texto, activo }: { tab: Exclude<Tab, 'contame'>; texto: string; activo: boolean }) {
  return (
    <Link
      href={RUTAS[tab]}
      prefetch
      aria-current={activo ? 'page' : undefined}
      className={`flex min-h-12 min-w-16 flex-auto flex-col items-center justify-center gap-0.5 text-sm leading-tight font-medium lg:min-h-14 lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-base ${activo ? 'font-semibold text-azul lg:bg-tinte' : 'text-texto-2 lg:hover:bg-gris'}`}
    >
      <Icono nombre={ICONOS[tab]} tamano={24} />
      <span>{texto}</span>
    </Link>
  )
}

/** Menú principal. Alfredo: Inicio, Calendario, Contame, Mensajes, Casas. Familia: Inicio, Fechas, Fotos, Casas. */
export default function BottomNav({ activo, rol = 'owner' }: { activo?: Tab | null; rol?: Rol }) {
  const pathname = usePathname()
  const actual = activo !== undefined ? activo : tabDe(pathname)
  const owner = rol === 'owner'
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 [view-transition-name:menu] border-t border-borde bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-60 lg:border-t-0 lg:border-r lg:bg-white lg:pb-0"
    >
      <div className="mx-auto flex max-w-xl items-end px-1 pt-1 lg:mx-0 lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Pestana tab="inicio" texto="Inicio" activo={actual === 'inicio'} />
        <Pestana tab="calendario" texto={owner ? 'Calendario' : 'Fechas'} activo={actual === 'calendario'} />
        {owner ? (
          <div className="flex flex-auto justify-center lg:flex-none lg:py-2">
            <Link
              href="/contame"
              prefetch
              aria-label="Hablar con el asistente"
              aria-current={actual === 'contame' ? 'page' : undefined}
              className="-mt-2 flex size-14 items-center justify-center rounded-full bg-azul text-white shadow-[0_6px_16px_rgba(31,78,140,0.28)] hover:bg-azul-osc lg:mt-0 lg:h-14 lg:w-full lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4"
            >
              <Icono nombre="microfono" tamano={26} trazo={2} />
              <span className="hidden text-base font-semibold lg:inline">Hablar con el asistente</span>
            </Link>
          </div>
        ) : (
          <Pestana tab="fotos" texto="Fotos" activo={actual === 'fotos'} />
        )}
        {owner && <Pestana tab="mensajes" texto="Mensajes" activo={actual === 'mensajes'} />}
        <Pestana tab="casas" texto="Casas" activo={actual === 'casas'} />
      </div>
    </nav>
  )
}
