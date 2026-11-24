import { NextResponse, type NextRequest } from 'next/server'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { generarPath, leerFoco, validarSubida } from '@/domain/archivos'

export async function POST(req: NextRequest) {
  let rol
  try {
    rol = (await requerirRol('owner', 'familia')).rol // R20; la matriz fina va en validarSubida
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!form || !(file instanceof Blob)) return NextResponse.json({ error: 'Elegí una foto.' }, { status: 400 })
  const v = validarSubida(rol, {
    tipo: form.get('tipo'), carpetaId: form.get('carpetaId'), titulo: form.get('titulo'),
    mime: file.type, bytes: file.size,
  })
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })
  const repo = getRepo()
  const uuid = crypto.randomUUID()
  if (v.valor.tipo === 'documento') {
    const { carpetaId, titulo, ext } = v.valor
    if (!(await repo.carpetas.get(carpetaId))) return NextResponse.json({ error: 'No existe esa carpeta.' }, { status: 400 })
    const path = await repo.uploadArchivo(generarPath('documento', ext, carpetaId, uuid), file)
    return NextResponse.json(await repo.documentos.create({ carpetaId, titulo, path }))
  }
  const path = await repo.uploadArchivo(generarPath('foto', v.valor.ext, undefined, uuid), file)
  // encuadre elegido en la vista previa (marco 16:9 de Inicio)
  return NextResponse.json(await repo.fotos.create({ path, focoX: leerFoco(form.get('focoX')), focoY: leerFoco(form.get('focoY')) }))
}
