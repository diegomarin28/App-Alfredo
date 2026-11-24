/**
 * Intro de AlfredIA (ronda 4b, mockups CargaGolf / CargaPadel): Alfredo "cabezón" (la cabeza real, que se bambolea,
 * sobre cuerpos dibujados) en golf o pádel, ~2,5 s al abrir la app en frío, con "AlfredIA · De: Pau y Diego".
 * Va en el HTML del servidor y la maneja un script chico antes de pintar (no espera a React): alterna golf y pádel en
 * cada apertura, no sale si la app ya estaba abierta en esta sesión, se saltea tocando y se va sola con CSS.
 * Con "reducir movimiento": el último cuadro, quieto, medio segundo.
 */
import type { CSSProperties } from 'react'
import { cajaCabeza, ESCENAS, INTRO_MS, ORIGEN_MENTON, type Escena } from '@/marca/intro'

/** Fundido entre cuadros. */
const FUNDIDO_MS = 45

/**
 * Sin intro si ya se vio en esta sesión o si la maneja un navegador automático (las pruebas);
 * localStorage 'alfredia:con-intro' = 'golf' | 'padel' la fuerza con esa escena.
 */
const SCRIPT = `(function(){var d=document.documentElement;try{var s=sessionStorage,l=localStorage;
var forzar=l.getItem('alfredia:con-intro');
if(s.getItem('alfredia:intro')||(navigator.webdriver&&!forzar)){d.setAttribute('data-intro','no');return}
s.setItem('alfredia:intro','1');
var e=forzar==='golf'||forzar==='padel'?forzar:(l.getItem('alfredia:intro-ultima')==='golf'?'padel':'golf');
l.setItem('alfredia:intro-ultima',e);
d.setAttribute('data-intro',e);
var fuera=function(){d.setAttribute('data-intro','no')};
document.addEventListener('pointerdown',fuera,{once:true,capture:true});
document.addEventListener('keydown',fuera,{once:true,capture:true});
setTimeout(fuera,${INTRO_MS + 700});
}catch(_){d.setAttribute('data-intro','no')}})()`

export function ScriptIntro() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}

const NOMBRES: Record<Escena, string> = { golf: 'Alfredo jugando al golf', padel: 'Alfredo haciendo una víbora en pádel' }

function EscenaIntro({ escena }: { escena: Escena }) {
  const { duracionMs, cuadros } = ESCENAS[escena]
  return (
    <div data-escena={escena} role="img" aria-label={NOMBRES[escena]} className="in-escena">
      {cuadros.map(([cuadro, desde], i) => {
        const siguiente = cuadros[i + 1]
        const animacion = [
          i === 0 ? null : `in-ver ${FUNDIDO_MS}ms linear ${Math.round(desde * duracionMs)}ms both`,
          siguiente ? `in-ocultar ${FUNDIDO_MS}ms linear ${Math.round(siguiente[1] * duracionMs)}ms forwards` : null,
        ].filter(Boolean).join(', ')
        const c = cajaCabeza(cuadro)
        return (
          <div key={cuadro} data-cuadro={cuadro} data-ultimo={siguiente ? undefined : ''} className="in-cuadro" style={{ animation: animacion || undefined }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- imágenes fijas de public/ */}
            <img src={`/marca/cuerpo_${cuadro}.png`} alt="" width={390} height={480} className="in-cuerpo" />
            <div className="in-caja" style={{ left: c.left, top: c.top, width: c.width, height: c.height, transform: `rotate(${c.rot}deg)`, transformOrigin: ORIGEN_MENTON } as CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/cabeza.png" alt="" className="in-cabeza" style={{ transformOrigin: ORIGEN_MENTON }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Intro() {
  return (
    <div id="intro" aria-hidden="true">
      <div className="in-escenario">
        <EscenaIntro escena="golf" />
        <EscenaIntro escena="padel" />
        <div className="in-sombra" />
      </div>
      <div className="in-marca">
        <span className="in-nombre">Alfred<span>IA</span></span>
        <span className="in-de">De: Pau y Diego</span>
      </div>
    </div>
  )
}
