import type { NextConfig } from 'next'

// El globo de "Next.js" de desarrollo tapa la pestaña Inicio y bloquea los toques en las pruebas e2e.
const nextConfig: NextConfig = { devIndicators: false }

export default nextConfig
