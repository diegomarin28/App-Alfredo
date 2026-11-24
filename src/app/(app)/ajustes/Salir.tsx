'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton } from '@/components/ui'
import { Icono } from '@/components/iconos'

export default function Salir() {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)
  async function salir() {
    setSaliendo(true)
    try { await fetch('/api/auth/salir', { method: 'POST' }) } catch { /* igual vamos a Entrar */ }
    router.push('/entrar')
    router.refresh()
  }
  return <Boton variante="peligro" className="w-full" disabled={saliendo} onClick={salir}><Icono nombre="salir" tamano={20} />Salir</Boton>
}

/** "Ver la guía de nuevo" (mockup v2). */
export function VerGuia() {
  const router = useRouter()
  return <Boton variante="suave" className="w-full" onClick={() => router.push('/guia')}>Ver la guía de nuevo</Boton>
}
