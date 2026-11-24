/**
 * Detalles personales (mockup v2, ronda 3): a Alfredo le gustan el whisky, el golf, el pádel, el truco y el
 * backgammon. Animaciones cortas en SVG/CSS (ver "Detalles personales" en globals.css); ninguna bloquea, y con
 * "reducir movimiento" se ve el cuadro final sin moverse.
 */
import type { CSSProperties, ReactNode } from 'react'

/** Golf: "Todo al día". Con `animar`, la pelota rueda y entra al hoyo (una vez, ~2 s); si no, el hoyo quieto. */
export function Golf({ nombre, animar = false, esperaMs = 0 }: { nombre: string; animar?: boolean; esperaMs?: number }) {
  return (
    <div
      data-detalle="golf" data-animando={animar || undefined}
      className={`flex flex-col items-center gap-1.5 pt-4 text-center ${animar ? 'dt-golf-anima' : ''}`}
      style={{ '--dt-espera': `${esperaMs}ms` } as CSSProperties}
    >
      <svg width="260" height="150" viewBox="0 0 260 150" role="img" aria-label="Una pelota de golf en el hoyo">
        <ellipse cx="130" cy="122" rx="122" ry="22" fill="#DDEEDD" />
        <ellipse cx="130" cy="122" rx="92" ry="15" fill="#CBE5CB" />
        <ellipse cx="150" cy="121" rx="13" ry="4.5" fill="#2E4A33" />
        <line x1="150" y1="121" x2="150" y2="34" stroke="#5F646B" strokeWidth="2.5" strokeLinecap="round" />
        <g className="dt-bandera"><path d="M151 35 L190 45 L151 56 Z" fill="#1F4E8C" /></g>
        <g className="dt-pelota"><circle cx="150" cy="115" r="6.5" fill="#FFFFFF" stroke="#AEB6C1" strokeWidth="1.2" /></g>
      </svg>
      <div className="dt-mensaje flex flex-col items-center gap-0.5">
        <span className="text-[22px] font-bold text-texto">Todo al día</span>
        <span className="text-base text-texto-2">Hoyo en uno, {nombre}.</span>
      </div>
    </div>
  )
}

/** Golf, swing: "Nada por vencer". El palo golpea la pelota una vez al entrar. */
export function Swing() {
  return (
    <div data-detalle="swing" className="flex flex-col items-center gap-2 pt-10 text-center">
      <svg width="240" height="150" viewBox="0 0 240 150" role="img" aria-label="Un palo de golf golpea la pelota">
        <ellipse cx="120" cy="134" rx="110" ry="12" fill="#DDEEDD" />
        <g className="dt-palo">
          <g transform="translate(70,10)">
            <line x1="0" y1="0" x2="0" y2="112" stroke="#5F646B" strokeWidth="3" strokeLinecap="round" />
            <path d="M-2 108 L14 112 Q16 120 8 121 L-3 119 Z" fill="#3A4250" />
            <rect x="-4" y="0" width="8" height="26" rx="3" fill="#1F4E8C" />
          </g>
        </g>
        <line x1="84" y1="132" x2="84" y2="126" stroke="#C9C1B4" strokeWidth="2.5" />
        <g className="dt-vuelo"><circle cx="84" cy="121" r="6" fill="#FFFFFF" stroke="#AEB6C1" strokeWidth="1.2" /></g>
      </svg>
      <span className="text-[22px] font-bold text-texto">Nada por vencer</span>
      <span className="max-w-[280px] text-base text-texto-2">Todo en regla. Vas bajo par.</span>
    </div>
  )
}

/** Pádel: la pelota rebota contra la pared mientras espera (reemplaza al "cargando"). */
export function Padel({ texto, detalle }: { texto: string; detalle?: string }) {
  return (
    <div role="status" data-detalle="padel" className="flex flex-col items-center gap-3 py-4 text-center">
      <div aria-hidden="true" className="relative h-[150px] w-[250px]">
        <div className="absolute top-2.5 right-0 bottom-[18px] w-3.5 rounded bg-[#C9D6E6]" />
        <div className="absolute top-2.5 right-3.5 bottom-[18px] w-0.5 bg-[#AFC2DA]" />
        <div className="absolute inset-x-0 bottom-4 h-0.5 bg-[#D3D9E1]" />
        <div className="dt-px absolute bottom-[18px] left-[50px] h-[120px] w-[26px]">
          <div className="dt-sombra absolute -bottom-1.5 left-px h-1.5 w-6 rounded-[50%] bg-texto" />
          <div className="dt-py absolute bottom-0 left-0">
            <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#D8E64C" stroke="#B5C23A" strokeWidth="1" /><path d="M4 7 Q13 13 4 20 M22 7 Q13 13 22 20" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </div>
        </div>
      </div>
      <span className="text-[20px] font-semibold text-texto">
        {texto}<span aria-hidden="true"><span className="dt-punto">.</span><span className="dt-punto">.</span><span className="dt-punto">.</span></span>
      </span>
      {detalle && <span className="text-base text-texto-2">{detalle}</span>}
    </div>
  )
}

const VASO = (
  <>
    <path d="M0 40 L6 118 Q7 126 15 126 L61 126 Q69 126 70 118 L76 40 Z" fill="rgba(255,255,255,0.14)" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M4 78 L72 78 L70 117 Q69 122 62 122 L14 122 Q7 122 6 117 Z" fill="#D9932E" />
    <path d="M4 78 L72 78 L71.6 84 L4.4 84 Z" fill="#F0B35A" />
    <rect x="16" y="66" width="20" height="20" rx="4" fill="rgba(255,255,255,0.75)" transform="rotate(-12 26 76)" />
    <rect x="38" y="70" width="18" height="18" rx="4" fill="rgba(255,255,255,0.6)" transform="rotate(10 47 79)" />
    <path d="M10 48 L14 112" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
  </>
)

/** Whisky: dos vasos con hielo brindan (una vez). Para fondo azul. */
export function Vasos({ ancho = 300 }: { ancho?: number }) {
  return (
    <svg width={ancho} height={(ancho * 170) / 300} viewBox="0 0 300 170" role="img" aria-label="Dos vasos de whisky brindan" data-detalle="brindis">
      <g className="dt-vaso-izq"><g transform="translate(50,0)">{VASO}</g></g>
      <g className="dt-vaso-der"><g transform="translate(174,0)">{VASO}</g></g>
      <g className="dt-chispa"><path d="M150 18 L150 0 M136 24 L126 10 M164 24 L174 10" stroke="#F2C14E" strokeWidth="3" strokeLinecap="round" /></g>
    </svg>
  )
}

/** Hielo: un cubo cae en el vaso (gesto de actualizar en Inicio). Cae solo mientras `animar`. */
export function VasoHielo({ animar }: { animar: boolean }) {
  return (
    <svg width="56" height="62" viewBox="0 0 56 62" role="img" aria-label="Un hielo cae en el vaso" className={animar ? 'dt-hielo-anima' : ''}>
      <path d="M10 36 L46 36 L44 55 Q43.5 58 40 58 L16 58 Q12.5 58 12 55 Z" fill="#E3A545" />
      <path d="M8 20 L11 56 Q12 60 16 60 L40 60 Q44 60 45 56 L48 20" fill="none" stroke="#1F4E8C" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <g className="dt-cubo"><rect x="20" y="26" width="15" height="15" rx="3" fill="#FFFFFF" stroke="#9CB3CF" strokeWidth="1.4" /></g>
      <g className="dt-gotas"><circle cx="16" cy="32" r="1.8" fill="#E3A545" /><circle cx="41" cy="31" r="1.5" fill="#E3A545" /></g>
    </svg>
  )
}

const DADO_SEIS = [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]]
const DADO_CUATRO = [[28, 28], [72, 28], [28, 72], [72, 72]]
function Dado({ puntos }: { puntos: number[][] }) {
  return (
    <svg width="54" height="54" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx="18" fill="#FFFFFF" stroke="#1F4E8C" strokeWidth="5" />
      {puntos.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill="#1F4E8C" />)}
    </svg>
  )
}

/** Backgammon: dos dados ruedan mientras escribe otra versión. */
export function Dados() {
  return (
    <div role="img" aria-label="Se tiran dos dados" data-detalle="dados" className="flex h-[92px] items-center justify-center gap-[18px] rounded-xl bg-tinte-claro">
      <span className="dt-dado1 flex"><Dado puntos={DADO_SEIS} /></span>
      <span className="dt-dado2 flex"><Dado puntos={DADO_CUATRO} /></span>
    </div>
  )
}

function Carta({ numero, className, style }: { numero: number; className: string; style: CSSProperties }) {
  const esquina = 'absolute text-[15px] font-bold text-texto'
  return (
    <div className={`absolute ${className}`} style={style}>
      <div className="relative flex h-[122px] w-[82px] items-center justify-center rounded-[9px] border-[1.5px] border-[#D3D9E1] bg-white shadow-[0_4px_12px_rgba(31,78,140,0.14)]">
        <span className={`${esquina} top-1 left-[7px]`}>{numero}</span>
        <span className={`${esquina} right-[7px] bottom-1 rotate-180`}>{numero}</span>
        {/* oro: moneda dorada */}
        <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="#F0B35A" stroke="#D9932E" strokeWidth="3" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="#D9932E" strokeWidth="2" />
          <circle cx="20" cy="20" r="3" fill="#D9932E" />
        </svg>
      </div>
    </div>
  )
}

/** Truco: ¡Flor! Tres cartas de oro (7, 12 y 3) se abren en abanico (~1,6 s). */
export function Flor() {
  return (
    <div data-detalle="flor" className="flex flex-col items-center gap-3.5">
      <div aria-hidden="true" className="relative h-[150px] w-[240px]">
        <Carta numero={7} className="dt-carta1" style={{ left: 30, top: 22 }} />
        <Carta numero={3} className="dt-carta3" style={{ left: 128, top: 22 }} />
        <Carta numero={12} className="dt-carta2" style={{ left: 79, top: 14 }} />
      </div>
      <div className="dt-grito flex flex-col items-center gap-0.5 text-center">
        <span className="text-[34px] font-bold tracking-[-0.5px] text-[#A9670F]">¡Flor!</span>
        <span className="text-base text-texto-2">Tres resueltos en el día.</span>
      </div>
    </div>
  )
}

/** Aviso flotante que no bloquea (se puede seguir tocando): para la Flor. */
export function Flotante({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[calc(5rem+env(safe-area-inset-top))] z-[44] flex justify-center lg:left-60">
      <div className="rounded-3xl bg-white/95 px-6 py-5 shadow-[0_12px_40px_rgba(31,78,140,0.18)] backdrop-blur">{children}</div>
    </div>
  )
}
