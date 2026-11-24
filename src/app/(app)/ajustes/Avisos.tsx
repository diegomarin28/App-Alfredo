'use client'
import { useEffect, useState } from 'react'
import { Boton, IconoTile } from '@/components/ui'

type Estado = 'cargando' | 'no-instalada' | 'lista' | 'activando' | 'activados' | 'sin-permiso' | 'error'

function aBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export default function Avisos({ vapidPublica }: { vapidPublica: string }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [error, setError] = useState('')

  useEffect(() => {
    const instalada = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setEstado(!instalada ? 'no-instalada' : 'lista')
  }, [])

  async function activar() {
    setEstado('activando')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublica) {
        throw new Error('Este teléfono no permite avisos o falta configurarlos. Avisale a Diego.')
      }
      // El permiso se pide dentro del toque (iOS lo exige).
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') return setEstado('sin-permiso')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(vapidPublica) }))
      const res = await fetch('/api/push/suscribir', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error('No se pudo guardar. Probá de nuevo.')
      setEstado('activados')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron activar los avisos. Probá de nuevo.')
      setEstado('error')
    }
  }

  if (estado === 'cargando') return null
  const detalle = {
    'no-instalada': 'Para recibirlos, instalá la app: en Safari tocá Compartir › Agregar a inicio, y abrila desde el ícono.',
    lista: 'Te aviso de vencimientos, recordatorios y cumpleaños.',
    activando: 'Activando…',
    activados: 'Activados · todos los días a las 11',
    'sin-permiso': 'No diste permiso. Podés activarlo en Configuración del iPhone.',
    error,
  }[estado]
  return (
    <div className="space-y-3 rounded-2xl border border-borde bg-white p-4">
      <div className="flex items-center gap-3">
        <IconoTile nombre="campana" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-texto">Avisos</p>
          <p role={estado === 'activados' ? 'status' : estado === 'sin-permiso' || estado === 'error' ? 'alert' : undefined}
            className={`text-base ${estado === 'error' ? 'text-urg-tx' : 'text-texto-2'}`}>
            {detalle}
          </p>
        </div>
      </div>
      {(estado === 'lista' || estado === 'activando' || estado === 'error' || estado === 'sin-permiso') && (
        <Boton className="w-full" onClick={activar} disabled={estado === 'activando'}>
          {estado === 'activando' ? 'Activando…' : 'Activar avisos'}
        </Boton>
      )}
    </div>
  )
}
