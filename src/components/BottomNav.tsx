'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { Rol } from '@/auth/access'

export type Tab = 'inicio' | 'calendario' | 'contame' | 'mensajes' | 'casas'

const RUTAS: Record<Tab, string> = {
  inicio: '/', calendario: '/calendario', contame: '/contame', mensajes: '/mensajes', casas: '/casas',
}

function tabDe(path: string | null): Tab | null {
  if (!path) return null
  if (path === '/') return 'inicio'
  return (Object.keys(RUTAS) as Tab[]).find((t) => t !== 'inicio' && (path === RUTAS[t] || path.startsWith(RUTAS[t] + '/'))) ?? null
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const ICONOS: Record<Exclude<Tab, 'contame'>, ReactNode> = {
  inicio: svg(<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  calendario: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  mensajes: svg(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />),
  casas: svg(<path d="M3 21h18M5 21V9l7-5 7 5v12M10 21v-6h4v6" />),
}

function Pestana({ tab, texto, activo }: { tab: Exclude<Tab, 'contame'>; texto: string; activo: boolean }) {
  return (
    <Link
      href={RUTAS[tab]}
      aria-current={activo ? 'page' : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-medium ${activo ? 'text-azul' : 'text-texto-2'}`}
    >
      {ICONOS[tab]}
      <span>{texto}</span>
    </Link>
  )
}

export default function BottomNav({ activo, rol = 'owner' }: { activo?: Tab | null; rol?: Rol }) {
  const pathname = usePathname()
  const actual = activo !== undefined ? activo : tabDe(pathname)
  const owner = rol === 'owner'
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-xl items-end px-2">
        <Pestana tab="inicio" texto="Inicio" activo={actual === 'inicio'} />
        <Pestana tab="calendario" texto="Calendario" activo={actual === 'calendario'} />
        {owner && (
          <div className="flex flex-1 justify-center">
            <Link
              href="/contame"
              aria-label="Hablar con el asistente"
              aria-current={actual === 'contame' ? 'page' : undefined}
              className="-mt-6 flex size-16 items-center justify-center rounded-full bg-azul text-white shadow-lg ring-4 ring-white hover:bg-azul-osc"
            >
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </Link>
          </div>
        )}
        {owner && <Pestana tab="mensajes" texto="Mensajes" activo={actual === 'mensajes'} />}
        <Pestana tab="casas" texto="Portofino" activo={actual === 'casas'} />
      </div>
    </nav>
  )
}
