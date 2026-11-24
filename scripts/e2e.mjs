// `pnpm e2e`: corre Playwright en tandas de 3 proyectos, cada una con su propio servidor.
// Motivo: `next dev` retiene memoria con cada pedido (~0,3 MB, aun en una página vacía); con ~1000 pruebas por
// motor se quedaba sin memoria cerca del final. Si se pasa --project, se corre una sola vez.
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const TANDAS = [
  ['chromium-375x667', 'chromium-390x844', 'chromium-402x874'],
  ['chromium-430x932', 'chromium-440x956', 'chromium-desktop'],
  ['webkit-375x667', 'webkit-390x844', 'webkit-402x874'],
  ['webkit-430x932', 'webkit-440x956', 'webkit-desktop'],
]
const tandas = args.some((a) => a.startsWith('--project')) ? [[]] : TANDAS.map((t) => t.map((p) => `--project=${p}`))

let codigo = 0
for (const tanda of tandas) {
  const r = spawnSync('playwright', ['test', ...tanda, ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.error) console.error(r.error)
  if (r.status !== 0) codigo = r.status ?? 1
}
process.exit(codigo)
