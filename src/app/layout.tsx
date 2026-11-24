import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Intro, { ScriptIntro } from '@/components/Intro'
import { PANTALLAS_IPHONE } from '@/marca/pantallas'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'AlfredIA',
  applicationName: 'AlfredIA',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true, title: 'AlfredIA', statusBarStyle: 'default',
    // pantalla de carga estática de iOS (fondo #112A50, la cabeza y "AlfredIA"): una por tamaño de iPhone
    startupImage: PANTALLAS_IPHONE.map((p) => ({
      url: `/carga/${p.ancho * p.escala}x${p.alto * p.escala}.jpg`,
      media: `(device-width: ${p.ancho}px) and (device-height: ${p.alto}px) and (-webkit-device-pixel-ratio: ${p.escala}) and (orientation: portrait)`,
    })),
  },
  other: { 'apple-mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#1F4E8C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // el script de la intro marca <html> antes de pintar (data-intro): no es un error de hidratación
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head><ScriptIntro /></head>
      <body>
        <Intro />
        {children}
      </body>
    </html>
  )
}
