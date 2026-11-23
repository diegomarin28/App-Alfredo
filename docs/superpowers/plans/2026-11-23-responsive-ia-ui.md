# App Alfredo — Responsive, link de familia, IA con dos modelos y revisión de UI

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD: write the failing test first, watch it fail, then implement.

**Goal:** Four follow-up changes on branch `plan-app` after the 17 tasks of `2026-11-22-app-alfredo.md`.

**Spec:** `docs/spec.md` (product). This plan's requirements come from Diego's request of 2026-11-23, quoted in each task. Reference screens: `docs/mockup/*.dc.html` (390×844, see `docs/mockup/README.md`).

## Global Constraints

- Node 20+, pnpm. `pnpm test` (Vitest) and `pnpm e2e` (Playwright) must pass before every commit that touches `src/` or `tests/`.
- **Do not touch Supabase** (no migrations, no schema changes, no MCP/CLI calls, no change to the columns `SupabaseRepo` reads/writes), **do not touch Vercel**, **never merge to main**, never push (the controller pushes).
- Tests never hit Supabase, Anthropic, Resend or push services.
- Colors exactly: `#1F4E8C`, `#183E70`, `#F5F7FA`, `#E3E8EF`, `#E3EBF6`, `#ECEFF4`, `#1C1F24`, `#5F646B`, `#FCEBDD`, `#8A4A12`. Font Inter. Touch targets ≥ 44×44 px. Text ≥ 16px.
- All UI copy in Spanish (voseo), as in the spec and mockup.
- Playwright stays `workers: 1` (the e2e server uses one shared in-memory repo).
- Commit messages: conventional (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Responsive for iPhone 14+ and desktop

Request: "Responsive para todos los iPhone del 14 en adelante y para computadora. Proyectos de Playwright en 375x667, 390x844, 402x874, 430x932 y 440x956, más 'desktop' 1440x900 (Chromium y WebKit). Todos los e2e deben pasar en todos. En pantallas >= 1024px: contenido centrado (máximo ~720px) y navegación en barra lateral en vez de la barra de abajo."

**Files:** `playwright.config.ts`, `src/app/(app)/layout.tsx`, `src/components/BottomNav.tsx` (or a new `src/components/Nav*.tsx`), `tests/unit/BottomNav.test.tsx`, any e2e spec or page that breaks at a new size/engine, `tests/e2e/helpers.ts`.

- [ ] Replace the single `iphone` project with 12 projects: every size × {chromium, webkit}.
  - Sizes (viewport width×height): `375x667`, `390x844`, `402x874`, `430x932`, `440x956` (phones: mobile + touch emulation, deviceScaleFactor 3, use an iPhone descriptor from `devices` as the base and override `viewport`), and `desktop` = `1440x900` (no mobile/touch, deviceScaleFactor 1).
  - Project names: `chromium-375x667`, `webkit-375x667`, …, `chromium-desktop`, `webkit-desktop`.
  - Make sure the WebKit browser is installed (`pnpm exec playwright install webkit`).
- [ ] At viewport width ≥ 1024px (Tailwind `lg:`): the app content column is centered with max width ~720px (`max-w-[720px]`), and the main navigation is a fixed left sidebar (vertical list with the same items, icons and labels, same owner/familia rules, Contame still prominent); the bottom bar is not rendered/visible and the content no longer needs the bottom padding reserved for it. Below 1024px nothing changes from today's bottom bar.
  - The nav keeps `aria-label="Principal"` and the same link accessible names so existing e2e selectors work in both layouts. Exactly one "Principal" nav visible at any width.
  - Content must not sit under the sidebar at 1024px–1440px.
- [ ] Unit test (Vitest) for the nav covering the new sidebar markup/classes; e2e test that at `desktop` the sidebar is visible on the left, the bottom bar is not, and the main content's width ≤ 720px and is horizontally centered in the space to the right of the sidebar (or in the viewport — document which); at phone sizes the bottom bar is visible.
- [ ] Run the full suite on all 12 projects; fix every failure (layout/overflow bugs in `src/`, or test flakiness from engine differences). Prefer fixing the app over weakening tests.
  - **Ruling (controller):** tests that use `conFaceIdVirtual` need Chromium's CDP WebAuthn virtual authenticator, which WebKit does not have. Those tests (only) are skipped on WebKit with `test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')`. They still run on every Chromium size. Any other skip needs a written reason in the report.
- [ ] Commit.

### Task 2: Remove the family link from Ajustes

Request: "Sacá el link de familia de Ajustes. Alfredo nunca lo ve; el link se arma con FAMILY_CODE y lo comparte Diego."

**Files:** `src/app/(app)/ajustes/page.tsx`, delete `src/app/(app)/ajustes/LinkFamilia.tsx`, `src/domain/linkFamilia.ts` + `tests/unit/linkFamilia.test.ts` (delete if nothing else uses them), `tests/e2e/ajustes.spec.ts`, `docs/deploy.md`.

- [ ] E2e first: replace the test "Ajustes: link para la familia con copiar y WhatsApp" with one asserting `/ajustes` (owner) shows no "Link para la familia" region, no `FAMILY_CODE` value and no `/familia?codigo=` anywhere in the page HTML.
- [ ] Remove the section and the component; remove now-unused code.
- [ ] Family mode itself (`/familia?codigo=…`, expiry, allowed pages) is unchanged; its e2e tests must still pass.
- [ ] `docs/deploy.md`: add a short section (Spanish) telling Diego how to build and share the link: `<APP_ORIGIN>/familia?codigo=<FAMILY_CODE>` (URL-encoded code), valid until `FAMILY_EXPIRES_AT`, shared by Diego via WhatsApp.
- [ ] Commit.

### Task 3: AI with two models, per-model prices, prompt caching

Request: "IA con dos modelos: Mensajes usa claude-sonnet-5-5 (2 / 10 USD por millón de tokens de entrada / salida) y Contame usa claude-haiku-5-5 (0.10 / 0.50). El presupuesto suma el costo de cada uno con su precio. Prompt caching en los system prompts; max_tokens 400 en Mensajes y 800 en Contame. Verificá que el tool use de Contame funcione con Haiku."

**Files:** `src/ai/client.ts`, `src/ai/presupuesto.ts`, `src/ai/mensajes.ts`, `src/ai/contame.ts`, `src/ai/index.ts`, `tests/unit/{client,presupuesto,mensajes,contame}.test.ts`, `tests/e2e/entorno.ts`, `.env.example`, `docs/deploy.md`. Do NOT change `UsoIa`'s stored fields (no Supabase changes).

API facts (from Anthropic's current docs, verified by the controller 2026-11-23):
- Prices USD per million tokens. `claude-sonnet-5-5`: input 2, output 10, cache read 0.10, 5-minute cache write 1.25 × input = 2.50. `claude-haiku-5-5`: input 0.10, output 0.50, cache read 0.10 × input = 0.01, 5-minute cache write 1.25 × input = 0.125; **when the prompt is > 100,000 input tokens Haiku 5.5 bills 0.50 / 2.50** (cache multipliers apply to that input rate).
- `response.usage` has `input_tokens` (uncached), `cache_creation_input_tokens`, `cache_read_input_tokens` (either may be null/absent → 0), `output_tokens`. "Prompt" size for the Haiku tier = sum of the three input fields.
- Caching: `system` sent as an array `[{ type: 'text', text, cache_control: { type: 'ephemeral' } }]` (5-minute TTL). Minimum cacheable prefix on both models is 512 tokens; shorter prompts silently don't cache (no error).
- `claude-sonnet-5-5`: forced `tool_choice` `any`/`tool` returns 400 (already handled by `RECHAZA_TOOL_FORZADA`). Thinking is adaptive and ON by default at effort `high` and counts toward `max_tokens`; `thinking: {type: 'disabled'}` is a 400 — to turn thinking off send `thinking: { type: 'between_tools' }` (no other field alongside).
- `claude-haiku-5-5`: accepts forced `tool_choice` (`any` or named tool) and then answers with the tool call directly, with no thinking block. Thinking is adaptive and ON by default (effort `medium`) and counts toward `max_tokens`. No `temperature`/`top_p`/`top_k`, no prefill.
- Responses may start with `thinking` blocks: read blocks by `type` (the client already does).

Steps:
- [ ] `AiArgs` gains the model to use (a `ModeloIa` union of the two IDs) and an option to turn thinking off. Export constants `MODELO_MENSAJES = 'claude-sonnet-5-5'` and `MODELO_CONTAME = 'claude-haiku-5-5'`. `AnthropicClient` uses the per-call model (no global model; remove `ANTHROPIC_MODEL` and `MODELO_POR_DEFECTO`).
- [ ] `AnthropicClient`: system prompt always sent as a single cached text block (above). Thinking-off on Sonnet 5.5 → `thinking: { type: 'between_tools' }`. Keep current tool_choice logic.
- [ ] `AiResultado` gains `tokensCacheWrite` and `tokensCacheRead` (0 when absent) and `modelo`. `FakeAiClient` defaults them to 0 and echoes the requested model.
- [ ] Price table in code (`src/ai/precios.ts` or in `presupuesto.ts`) keyed by model with the values above; `costoUsd(modelo, usage)` = uncached in × input + cache write × write + cache read × read + out × output, all /1e6, with the Haiku > 100K tier. `usarIa` uses it; the env vars `AI_PRICE_INPUT_PER_MTOK` / `AI_PRICE_OUTPUT_PER_MTOK` are no longer read or required (remove from code, tests, `tests/e2e/entorno.ts`, `.env.example`, `docs/deploy.md` table). The stored `UsoIa.tokensIn` = sum of the three input counts; `costoUsd` is the exact per-model cost. Budget/alert logic (`AI_BUDGET_USD`, `AI_ALERT_USD`, alert once) unchanged: the total is the sum of `costoUsd` across both models.
- [ ] Mensajes: `modelo: MODELO_MENSAJES`, `maxTokens: 400`, thinking off. Contame: `modelo: MODELO_CONTAME`, `maxTokens: 800`, **`forzarHerramienta: true`** + `unaSolaHerramienta: true` (Haiku accepts forced `any`; the model always must call `guardar` or `preguntar`, and forcing skips thinking so the 800 tokens go to the tool input). Keep the `max_tokens` → `cortada` path (a long paste can now be cut; it is saved raw with the existing aviso).
- [ ] Unit tests (Vitest, mock the SDK's `messages.create` — e.g. `vi.mock('@anthropic-ai/sdk')` or inject a fake client — never call the network): request for Contame has `model: 'claude-haiku-5-5'`, `max_tokens: 800`, `tool_choice: { type: 'any', disable_parallel_tool_use: true }`, tools `guardar`/`preguntar`, cached system block; request for Mensajes has `model: 'claude-sonnet-5-5'`, `max_tokens: 400`, `thinking: { type: 'between_tools' }`, no `tool_choice`, cached system block; a Haiku response whose content is `[tool_use guardar {acciones:[…]}]` with `stop_reason: 'tool_use'` flows through `clasificar` to acciones; a response starting with a `thinking` block then text/tool_use is parsed correctly; costs: Sonnet (1M in, 1M out) = 12 USD, Haiku (1M in, 1M out) = 0.60, cache read/write priced, Haiku > 100K tier, and a mixed Sonnet + Haiku history sums both toward the budget/alert.
- [ ] Verification of Contame tool use with Haiku: there is no `ANTHROPIC_API_KEY` in this environment and tests must not hit the network. Add `scripts/probar-haiku.ts` (run with `pnpm tsx` or `node --experimental-strip-types`, whichever works without new runtime deps; a devDependency is OK) that, given `ANTHROPIC_API_KEY`, sends one real Contame classification with the real prompt/tools on Haiku and prints model, stop_reason, tool name, tool input, usage (incl. cache fields) and cost; document it in `docs/deploy.md`. Do not run it against the real API.
- [ ] Commit.

### Task 4: UI review at every size

Request: "Revisión de UI: en cada tamaño, verificá botones >= 44x44 px, texto >= 16px, sin scroll horizontal y contraste con axe-core. Sacá capturas de cada pantalla, compará con docs/mockup/ y arreglá espaciado, alineación y jerarquía."

**Files:** new `tests/e2e/ui.spec.ts`, `package.json` (devDependency `@axe-core/playwright`), any `src/` component/page that fails, `.gitignore` if needed.

- [ ] New e2e spec, run on all 12 projects, visiting every screen with realistic seed data (owner: Inicio, Calendario, Recordatorios, Contame, Mensajes, Casas/Portofino + Malibú, Contactos, Vencimientos, Pendientes, Documentos + a carpeta, Claves (locked state is enough), Ajustes, Fotos if it is a screen; familia: its allowed screens; public: Entrar, Configurar, the familia landing/expired page, 404). For each screen, in its initial state:
  - every visible interactive element (`a[href]`, `button`, `input` except hidden, `select`, `textarea`, `[role=button]`, `summary`, `label` wrapping a checkbox/radio) has a bounding box ≥ 44×44 CSS px. Exception allowed only for links inside running text (WCAG 2.5.8 inline exception) — list them in the report.
  - every visible text node's computed `font-size` ≥ 16px.
  - `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal scroll).
  - `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21aa` reports zero violations (contrast included).
  - Failure messages name the screen, project and offending elements.
- [ ] Fix every failure in the app (not by weakening the checks).
- [ ] Screenshots: a script or Playwright spec tagged so it does not run in the normal `pnpm e2e` (e.g. a `capturas` project or `--grep @capturas`, exposed as `pnpm capturas`) that saves a full-page PNG of every screen above for every project into a git-ignored folder (`capturas/<proyecto>/<pantalla>.png`), and renders each `docs/mockup/*.dc.html` at 390×844 into `capturas/mockup/<nombre>.png`.
- [ ] Compare each screen at `chromium-390x844` (and spot-check 375x667, 440x956 and desktop) against its mockup image: fix spacing (padding/gaps between cards and sections), alignment (left edges, centered elements, icon/text baselines) and hierarchy (title sizes/weights, section headings, primary vs secondary buttons) to match the mockup. Real data replaces the bracketed example text; don't add mockup-only content or features. Record in the report, per screen, what differed and what you changed (or why you left it).
- [ ] Full `pnpm test` and `pnpm e2e` green on all projects. Commit (several commits are fine).
