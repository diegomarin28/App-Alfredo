import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Alfredo',
  manifest: '/manifest.webmanifest',
  icons: { apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Alfredo', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#1F4E8C',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
