// `pnpm e2e`: corre Playwright una vez por motor (Chromium y después WebKit), cada una con su propio servidor.
// Motivo: `next dev` retiene memoria con cada pedido (~0,3 MB, aun en una página vacía) y con los 12 proyectos
// en una sola corrida se quedaba sin memoria cerca del final. Si se pasa --project, se corre una sola vez.
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const tandas = args.some((a) => a.startsWith('--project')) ? [[]] : [['--project=chromium-*'], ['--project=webkit-*']]

let codigo = 0
for (const tanda of tandas) {
  const r = spawnSync('playwright', ['test', ...tanda, ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.error) console.error(r.error)
  if (r.status !== 0) codigo = r.status ?? 1
}
process.exit(codigo)
