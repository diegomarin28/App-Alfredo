'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton } from '@/components/ui'

export default function Salir() {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)
  async function salir() {
    setSaliendo(true)
    try { await fetch('/api/auth/salir', { method: 'POST' }) } catch { /* igual vamos a Entrar */ }
    router.push('/entrar')
    router.refresh()
  }
  return <Boton variante="suave" disabled={saliendo} onClick={salir}>Salir</Boton>
}
