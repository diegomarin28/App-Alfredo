import 'server-only'
import { notFound } from 'next/navigation'
import { requerirRol } from '@/auth/session'

/** Defensa extra a la del middleware: documentos es solo del owner. */
export async function soloOwner(): Promise<void> {
  try { await requerirRol('owner') } catch { notFound() }
}
