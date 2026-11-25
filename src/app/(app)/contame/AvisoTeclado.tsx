/**
 * Ronda 11: el dictado web del iPhone anda una vez por apertura; después se dicta con el 🎤 del teclado de iOS.
 * Dibujo del teclado con el micrófono marcado abajo a la derecha, y el texto que lo explica.
 */
export default function AvisoTeclado({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-tinte p-4">
      <svg viewBox="0 0 120 80" width="96" height="64" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="118" height="78" rx="10" className="fill-current text-borde-fuerte" />
        {[0, 1, 2].map((fila) =>
          Array.from({ length: 8 - fila }, (_, i) => (
            <rect key={`${fila}-${i}`} x={8 + fila * 6 + i * 13.5} y={8 + fila * 16} width="10" height="12" rx="2.5" className="fill-current text-white" />
          )),
        )}
        {/* fila de abajo: 123, mundo, espacio y, a la derecha, el micrófono */}
        <rect x="8" y="57" width="16" height="14" rx="3" className="fill-current text-white" />
        <rect x="28" y="57" width="58" height="14" rx="3" className="fill-current text-white" />
        <circle cx="102" cy="64" r="12" className="fill-current text-azul" />
        <path d="M102 56.5a3 3 0 0 1 3 3v4.5a3 3 0 0 1-6 0v-4.5a3 3 0 0 1 3-3Zm-6 7.5a6 6 0 0 0 12 0M102 70v2.5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <p className="text-[20px] leading-snug font-bold text-texto">{texto}</p>
    </div>
  )
}
