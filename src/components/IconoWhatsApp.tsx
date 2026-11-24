/** Globo de WhatsApp con el teléfono adentro (decorativo: el link lleva su propio nombre). */
export default function IconoWhatsApp({ tamano = 22 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" className="shrink-0">
      <path d="M20.5 11.7a8.6 8.6 0 0 1-12.7 7.5L3.5 20.5l1.4-4.2a8.6 8.6 0 1 1 15.6-4.6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path fill="currentColor" d="M9.1 7.6c.2-.3.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.7 2.6l.6-.5c.2-.2.4-.2.6-.1l1.7.7c.3.1.4.3.4.5v.5c0 .3-.2.6-.5.8-.6.4-1.3.5-2.1.3-2.3-.6-4.6-2.9-5.2-5.2-.2-.8-.1-1.5.4-2.1z" />
    </svg>
  )
}
