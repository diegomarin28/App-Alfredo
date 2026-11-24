/** "AlfredIA": "IA" en #8FB8EC sobre fondo oscuro; en azul sobre fondo claro. */
export function NombreApp({ oscuro = false, className = '' }: { oscuro?: boolean; className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.5px] ${className}`}>
      Alfred<span className={oscuro ? 'text-[#8FB8EC]' : 'text-azul'}>IA</span>
    </span>
  )
}
