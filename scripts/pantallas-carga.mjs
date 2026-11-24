// Genera las apple-touch-startup-image de public/carga/ (ronda 4b): el primer cuadro del golf (cuerpo + la cabeza
// de Alfredo), "AlfredIA" y "De: Pau y Diego", sobre el azul de la marca. Igual a la intro al arrancar.
// Uso: node scripts/pantallas-carga.mjs   (vuelve a generarlas si cambia la marca)
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

const PANTALLAS = [[390, 844], [428, 926], [393, 852], [430, 932], [402, 874], [420, 912], [440, 956]]
const b64 = (f) => readFileSync(new URL(`../public/marca/${f}`, import.meta.url)).toString('base64')
const cuerpo = b64('cuerpo_golf1.png'), cabeza = b64('cabeza.png')
// caja de la cabeza en golf1 (posiciones_cabeza.json; igual que src/marca/intro.ts)
const p = { x: 186.75, chin: 89.25, h: 67.5 }
const ancho = (115 * p.h * 1.34) / 148, alto = (ancho * 179) / 115
const caja = { left: p.x - ancho / 2, top: p.chin - 0.06 * p.h - (alto * 148) / 179, width: ancho, height: alto }
const fuente = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;800&display=block'

mkdirSync(new URL('../public/carga/', import.meta.url), { recursive: true })
const navegador = await chromium.launch()
for (const [w, h] of PANTALLAS) {
  const pagina = await navegador.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3 })
  await pagina.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${fuente}"><style>
    html,body{margin:0;height:100%;overflow:hidden}
    body{position:relative;font-family:Inter,system-ui,sans-serif;color:#fff;background:radial-gradient(120% 70% at 50% 35%,#1D3F72 0%,#112A50 60%,#0B1D3A 100%)}
    .esc{position:absolute;left:calc(50% - 195px);top:calc(50% - 246px);width:390px;height:480px}
    .cu{position:absolute;left:0;top:0;width:390px;height:480px}
    .cab{position:absolute;left:${caja.left}px;top:${caja.top}px;width:${caja.width}px;height:${caja.height}px;transform:rotate(-7deg);transform-origin:50% 82.7%;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
    .som{position:absolute;left:95px;right:95px;top:472px;height:10px;border-radius:50%;background:rgba(0,0,0,.22)}
    .mk{position:absolute;left:0;right:0;bottom:96px;display:flex;flex-direction:column;align-items:center;gap:10px}
    .n{font-size:40px;font-weight:800;letter-spacing:-1px}.n b{color:#8FB8EC;font-weight:800}
    .d{font-size:14px;color:#9FB3D1;letter-spacing:.2px}
  </style></head><body>
    <div class="esc"><img class="cu" src="data:image/png;base64,${cuerpo}"><img class="cab" src="data:image/png;base64,${cabeza}"><div class="som"></div></div>
    <div class="mk"><span class="n">Alfred<b>IA</b></span><span class="d">De: Pau y Diego</span></div>
  </body></html>`)
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.screenshot({ path: new URL(`../public/carga/${w * 3}x${h * 3}.jpg`, import.meta.url).pathname, type: "jpeg", quality: 85 })
  await pagina.close()
}
await navegador.close()
console.log('listo:', PANTALLAS.length, 'pantallas')
