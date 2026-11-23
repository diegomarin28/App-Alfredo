/**
 * Portero de toda la app (Edge). Solo usa iron-session y la matriz pura de acceso:
 * nada de repo ni módulos de servidor.
 *   sin sesión        → páginas a /entrar, APIs 401
 *   familia prohibida → páginas a /, APIs 403
 *   familia vencida   → como sin sesión, y se borra la cookie
 */
import { NextResponse, type NextRequest } from 'next/server'
import { esApi, esPublica, puedeVer } from '@/auth/access'
import { COOKIE_SESION, leerSesion } from '@/auth/sesionSellada'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (esPublica(path)) return NextResponse.next()

  const ahora = new Date()
  const cookie = req.cookies.get(COOKIE_SESION)?.value
  const sesion = await leerSesion(cookie, ahora)
  const rol = sesion?.rol ?? null
  if (puedeVer(rol, path, ahora)) return NextResponse.next()

  const api = esApi(path)
  let res: NextResponse
  if (rol === null) {
    res = api
      ? NextResponse.json({ error: 'Tenés que entrar primero.' }, { status: 401 })
      : NextResponse.redirect(new URL('/entrar', req.url))
    // Cookie vencida, inválida o de familia fuera de fecha: se borra.
    if (cookie) res.cookies.set(COOKIE_SESION, '', { path: '/', maxAge: 0 })
  } else {
    res = api
      ? NextResponse.json({ error: 'Esto no está disponible.' }, { status: 403 })
      : NextResponse.redirect(new URL('/', req.url))
  }
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const config = {
  // Todo menos los estáticos compilados; el resto de lo público lo decide esPublica().
  matcher: ['/((?!_next/static|_next/image).*)'],
}
