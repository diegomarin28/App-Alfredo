import imageCompression from 'browser-image-compression'

/** Achica la foto a 1600 px (JPEG). Si no se puede (p. ej. HEIC en un navegador viejo), va tal cual. */
export async function comprimir(archivo: Blob & { name?: string }): Promise<Blob> {
  try {
    return await imageCompression(archivo as File, { maxWidthOrHeight: 1600, initialQuality: 0.8, fileType: 'image/jpeg', useWebWorker: false })
  } catch {
    return archivo
  }
}

/** Sube una foto o un documento a POST /api/archivos. Devuelve el error para mostrar, o null si salió bien. */
export async function subirArchivo(campos: { tipo: 'foto' | 'documento'; carpetaId?: string; titulo?: string }, archivo: Blob): Promise<string | null> {
  const f = new FormData()
  f.set('tipo', campos.tipo)
  if (campos.carpetaId) f.set('carpetaId', campos.carpetaId)
  if (campos.titulo !== undefined) f.set('titulo', campos.titulo)
  f.set('file', await comprimir(archivo), 'foto.jpg')
  try {
    const res = await fetch('/api/archivos', { method: 'POST', body: f })
    if (res.ok) return null
    const j = (await res.json().catch(() => null)) as { error?: string } | null
    return j?.error ?? 'No se pudo subir. Probá de nuevo.'
  } catch {
    return 'No se pudo subir. Probá de nuevo.'
  }
}
