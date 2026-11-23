import { NextResponse, type NextRequest } from 'next/server'
import { codigoConfiguracionValido, codigoFamiliaValido } from '@/auth/codigos'
import {
  opcionesEntrada, opcionesRegistro, verificarEntrada, verificarRegistro,
} from '@/auth/passkeys'
import { cerrarSesion, getSesion, guardarDesafio, iniciarSesion, tomarDesafio } from '@/auth/session'
import { getRepo } from '@/data/getRepo'

type Ctx = { params: Promise<{ accion: string[] }> }

const error = (mensaje: string, status: number) => NextResponse.json({ error: mensaje }, { status })

async function cuerpo(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const j = await req.json()
    return j && typeof j === 'object' ? (j as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const ruta = (await params).accion.join('/')
  try {
    switch (ruta) {
      case 'registro/opciones': {
        const b = await cuerpo(req)
        if (!codigoConfiguracionValido(b?.codigo)) return error('El código no es correcto.', 403)
        const opciones = await opcionesRegistro(getRepo())
        await guardarDesafio(opciones.challenge, 'registro')
        return NextResponse.json(opciones)
      }
      case 'registro/verificar': {
        // El desafío de registro solo existe si antes se dio el código de configuración correcto.
        const desafio = await tomarDesafio('registro')
        if (!desafio) return error('Se venció el tiempo. Probá de nuevo.', 400)
        const b = await cuerpo(req)
        if (!b || !(await verificarRegistro(getRepo(), b as never, desafio))) return error('No se pudo registrar.', 400)
        await iniciarSesion('owner')
        return NextResponse.json({ ok: true })
      }
      case 'entrar/opciones': {
        const opciones = await opcionesEntrada()
        await guardarDesafio(opciones.challenge, 'entrada')
        return NextResponse.json(opciones)
      }
      case 'entrar/verificar': {
        const desafio = await tomarDesafio('entrada')
        if (!desafio) return error('Se venció el tiempo. Probá de nuevo.', 400)
        const b = await cuerpo(req)
        if (!b || !(await verificarEntrada(getRepo(), b as never, desafio))) return error('No se pudo entrar.', 401)
        await iniciarSesion('owner')
        return NextResponse.json({ ok: true })
      }
      case 'salir': {
        await cerrarSesion()
        return NextResponse.json({ ok: true })
      }
    }
  } catch (e) {
    console.error(`auth/${ruta}`, e)
    return error('No se pudo completar. Probá de nuevo.', 400)
  }
  return error('No existe.', 404)
}

/** GET /api/auth/familia?codigo=… : abre la sesión de familia y lleva al Inicio. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const ruta = (await params).accion.join('/')
  if (ruta !== 'familia') return error('No existe.', 404)
  const codigo = req.nextUrl.searchParams.get('codigo')
  const destino = new URL('/', req.url)
  // El dueño ya tiene sesión completa: no lo bajamos a familia.
  if ((await getSesion())?.rol === 'owner') return NextResponse.redirect(destino, 303)
  if (!codigoFamiliaValido(codigo, new Date()) || !(await iniciarSesion('familia'))) {
    return NextResponse.redirect(new URL('/familia?error=1', req.url), 303)
  }
  return NextResponse.redirect(destino, 303)
}
