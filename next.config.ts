import type { NextConfig } from 'next'

// El globo de "Next.js" de desarrollo tapa la pestaña Inicio y bloquea los toques en las pruebas e2e.
// staleTimes.static: lo que el menú precarga (prefetch completo) vale 30 s; guardar algo lo invalida igual
// (revalidatePath / router.refresh).
const nextConfig: NextConfig = { devIndicators: false, experimental: { staleTimes: { static: 30 } } }

export default nextConfig
