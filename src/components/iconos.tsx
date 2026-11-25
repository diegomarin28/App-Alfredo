import type { ReactNode } from 'react'

/** Íconos de línea del mockup v2 (24×24, trazo 1.8). Decorativos: el botón o link lleva su propio nombre. */
const TRAZOS = {
  inicio: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  microfono: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  mensaje: <path d="M4 5h16v11H9l-5 4z" />,
  casa: <path d="M3 20h18M5 20V10l7-5 7 5v10M10 20v-5h4v5" />,
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  flecha: <path d="M9 6l6 6-6 6" />,
  atras: <path d="M15 6l-6 6 6 6" />,
  abajo: <path d="M6 9l6 6 6-6" />,
  camara: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  torta: <path d="M4 21h16v-8H4zM4 16c2 1 4 1 5.3 0s4 1 5.4 0 3.3 1 5.3 0M12 13V9M12 6.5a1.5 1.5 0 0 1-1.5-1.5c0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5A1.5 1.5 0 0 1 12 6.5" />,
  campana: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  basura: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  salir: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  whatsapp: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2z" /></>,
  copiar: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  telefono: <path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2" />,
  tele: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 21h8M9 2l3 4 3-4" /></>,
  rayo: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  gota: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  wifi: <><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.3" r="1.1" fill="currentColor" stroke="none" /></>,
  escudo: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z" />,
  herramienta: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tilde: <path d="M5 12l5 5L20 7" />,
  repetir: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  carpeta: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  faceid: <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9v1.5M15 9v1.5M12 9v4h-1M9 15.5a4 4 0 0 0 6 0" />,
  imagen: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  candado: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  tuerca: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  personas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2" /></>,
  portapapeles: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h4" /></>,
  lapiz: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  parar: <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" stroke="none" />,
} satisfies Record<string, ReactNode>

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, tamano = 22, trazo = 1.8, className = '' }: {
  nombre: NombreIcono; tamano?: number; trazo?: number; className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth={trazo}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}
    >
      {TRAZOS[nombre]}
    </svg>
  )
}
