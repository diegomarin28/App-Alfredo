# App Alfredo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-user PWA for Alfredo's iPhone with birthdays, yearly reminders, house info, documents, encrypted passwords, AI-written messages and a voice inbox that files what he says.

**Architecture:** Next.js App Router app on Vercel. All data goes through a `Repo` interface with two implementations — `MemoryRepo` (tests, local dev, Playwright) and `SupabaseRepo` (production) — so the whole app is testable without a database or network. AI, push, email and clock are injected behind small interfaces and faked in tests.

**Tech Stack:** Next.js 15 (App Router, TypeScript strict), Tailwind CSS 4, Supabase (`@supabase/supabase-js`), `@anthropic-ai/sdk`, `@simplewebauthn/server` + `@simplewebauthn/browser`, `iron-session`, `web-push`, `resend`, `browser-image-compression`, Vitest + Testing Library (unit/component), Playwright (e2e, iPhone 14 emulation, Chromium virtual authenticator).

**Spec:** `docs/spec.md`

## Global Constraints

- Node 20+, pnpm. `pnpm test` (Vitest) and `pnpm e2e` (Playwright) must pass before every commit that touches `src/`.
- Env var `DATA_BACKEND=memory|supabase` (default `memory`). Tests never hit Supabase, Anthropic, Resend or push services.
- Timezone for all date logic: `America/Montevideo`. Dates stored as `YYYY-MM-DD` strings (no times) except timestamps of history/usage.
- Colors exactly: `#1F4E8C`, `#183E70`, `#F5F7FA`, `#E3E8EF`, `#E3EBF6`, `#ECEFF4`, `#1C1F24`, `#5F646B`, `#FCEBDD`, `#8A4A12`. Font Inter. Touch targets ≥ 44px. Base text 16px.
- All UI copy in Spanish (voseo), as written in the spec and mockup.
- Anthropic key only on the server (`ANTHROPIC_API_KEY`); model from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`). Prices from `AI_PRICE_INPUT_PER_MTOK` and `AI_PRICE_OUTPUT_PER_MTOK` (fill from docs.claude.com pricing; no hardcoded prices). `AI_BUDGET_USD=20`, `AI_ALERT_USD=16`, `ALERT_EMAIL`.
- Passwords section: the server never receives plaintext or the key.
- Family mode: `FAMILY_CODE`, `FAMILY_EXPIRES_AT=2026-11-25T23:59:00-03:00`.

## Review Focus

1. **Birthday on 29 Feb**: in non-leap years it is celebrated on 28 Feb (days-left and "cumple N" must not crash or skip the year). → Task 2.
2. **Midnight in Montevideo vs UTC**: the daily cron runs in UTC; "today" must be computed in Montevideo so a 23:30 local reminder is not off by one day. → Tasks 2 and 15.
3. **AI budget runs out mid-use**: a request that would exceed 20 USD returns the friendly out-of-credit message, never a 500; the alert email is sent exactly once. → Task 12.
4. **Contame with ambiguous or unknown things**: text mentioning a person not on file, or "el jardinero" (exists in both houses), must ask, not guess; text with several facts files each one. → Task 14.
5. **Family code used after expiry or on a forbidden page** (`/claves`, `/documentos`, `/contactos`, `/vencimientos`, `/mensajes`): redirect, never data. → Task 4.

---

## File Structure

```
src/
  app/                      # routes (one folder per screen), api/ routes
  components/               # BottomNav, Card, Chip, Sheet, Field, EmptyState
  domain/
    fechas.ts               # birthdays, yearly reminders, due dates (pure)
    telefono.ts             # UY phone normalize + wa.me links (pure)
    fotoDelDia.ts           # deterministic daily photo (pure)
    tipos.ts                # entity types shared by all layers
  data/
    repo.ts                 # Repo interface
    memoryRepo.ts           # in-memory impl + seed()
    supabaseRepo.ts         # Supabase impl
    getRepo.ts              # picks impl from DATA_BACKEND
  auth/
    session.ts              # iron-session, roles 'owner' | 'familia'
    access.ts               # route access matrix (pure)
    passkeys.ts             # WebAuthn register/login helpers
  ai/
    client.ts               # AiClient interface + Anthropic impl
    presupuesto.ts          # cost tracking, alert, limit
    mensajes.ts             # responder / escribir
    contame.ts              # clasificar dictado → acciones
  voz/useDictado.ts         # speech recognition hook with auto-restart
  avisos/
    calcular.ts             # avisosDelDia (pure)
    push.ts                 # web-push sender interface
  claves/cripto.ts          # AES-GCM, PRF/PIN key derivation (browser)
supabase/migrations/0001_init.sql
tests/unit/**  tests/e2e/**
```

---

### Task 1: Scaffold, design tokens, PWA

**Files:**
- Create: `package.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Delete: `index.html` (voice prototype; its logic moves to Task 14)

**Interfaces:**
- Produces: Tailwind theme tokens `azul`, `azul-osc`, `fondo`, `borde`, `tinte`, `gris`, `texto`, `texto-2`, `urg-bg`, `urg-tx`; Playwright project `iphone` using `devices['iPhone 14']`; `pnpm test`, `pnpm e2e`.

- [ ] **Step 1: Write the failing e2e smoke test** `tests/e2e/smoke.spec.ts`: page `/` returns 200, `<html lang="es">`, `link[rel=manifest]` exists, manifest has `display: "standalone"`, `name: "Alfredo"`, `theme_color: "#1F4E8C"`.
- [ ] **Step 2: Run** `pnpm e2e smoke` → FAIL (no app).
- [ ] **Step 3: Scaffold** Next.js + Tailwind + Vitest + Playwright; Inter via `next/font`; tokens in `globals.css`; manifest + `apple-mobile-web-app-capable` meta; `webServer` in Playwright config runs `pnpm dev` with `DATA_BACKEND=memory`.
- [ ] **Step 4: Run** `pnpm e2e smoke` and `pnpm test` → PASS.
- [ ] **Step 5: Commit** `chore: scaffold Next.js PWA with test setup`

---

### Task 2: Pure domain logic (dates, phones, daily photo)

**Files:**
- Create: `src/domain/tipos.ts`, `src/domain/fechas.ts`, `src/domain/telefono.ts`, `src/domain/fotoDelDia.ts`
- Test: `tests/unit/fechas.test.ts`, `tests/unit/telefono.test.ts`, `tests/unit/fotoDelDia.test.ts`

**Interfaces:**
- Produces (types in `tipos.ts`):
  - `Fecha { id; nombre: string; tipo: 'cumple' | 'aniversario' | 'otra'; dia: string /* MM-DD */; anioNacimiento?: number }`
  - `Recordatorio { id; titulo: string; dia: string | null /* MM-DD; null = fecha todavía no cargada, nunca activo */; avisarDiasAntes: number; pospuestoHasta?: string /* YYYY-MM-DD */; resueltoAnio?: number }`
  - `Vencimiento { id; titulo: string; ambito: 'empresa' | 'personal'; fecha: string; avisarDiasAntes: number; hecho: boolean }`
- Produces (functions):
  - `hoyMontevideo(now: Date): string` → `YYYY-MM-DD` in America/Montevideo
  - `hoy(): string` → `process.env.TEST_TODAY` when set and `NODE_ENV !== 'production'`, else `hoyMontevideo(new Date())`; every screen and route uses this, never `new Date()` directly
  - `proximaOcurrencia(diaMMDD: string, hoy: string): string` (29 Feb → 28 Feb in non-leap years)
  - `diasHasta(fecha: string, hoy: string): number`
  - `edadQueCumple(f: Fecha, hoy: string): number | null`
  - `proximosCumples(fechas: Fecha[], hoy: string): Array<Fecha & { proxima: string; dias: number; edad: number | null }>` sorted by `dias`
  - `recordatoriosActivos(rs: Recordatorio[], hoy: string): Array<Recordatorio & { proxima: string; dias: number }>` — active when `dias <= avisarDiasAntes`, not `resueltoAnio === year of proxima`, and `pospuestoHasta` absent or `<= hoy`
  - `posponer(r: Recordatorio, hoy: string): Recordatorio` (+15 days) · `resolver(r: Recordatorio, hoy: string): Recordatorio`
  - `vencimientosProximos(vs: Vencimiento[], hoy: string): Array<Vencimiento & { dias: number; urgente: boolean }>` (`urgente` = `dias <= 7`), excludes `hecho`
  - `normalizarTelUY(input: string): string | null`, `waLink(texto: string, telefono?: string): string`, `telLink(telefono: string): string`
  - `fotoDelDia<T>(fotos: T[], hoy: string): T | null`

- [ ] **Step 1: Write failing tests** with these exact cases:
  - `hoyMontevideo(new Date('2026-11-26T02:30:00Z'))` → `'2026-11-25'`
  - `proximaOcurrencia('11-25', '2026-11-22')` → `'2026-11-25'`; `proximaOcurrencia('11-20','2026-11-22')` → `'2027-11-20'`; `proximaOcurrencia('02-29','2026-03-01')` → `'2027-02-28'`; `proximaOcurrencia('02-29','2027-03-01')` → `'2028-02-29'`
  - `edadQueCumple({dia:'11-25', anioNacimiento:1964, …}, '2026-11-22')` → `62`
  - recordatorio `{dia:'12-25', avisarDiasAntes:60}` active on `'2026-10-26'` (60 days), inactive on `'2026-10-25'`; after `posponer` on `'2026-10-26'` inactive until `'2026-11-10'`; after `resolver` inactive for 2026 and active again on `'2027-10-26'`
  - `normalizarTelUY('099 123 456')` → `'59899123456'`; `('+598 99 123 456')` → `'59899123456'`; `('2710 1721')` → `'59827101721'`; `('abc')` → `null`
  - `waLink('¡Feliz cumple, Martín! 🎉')` → `'https://wa.me/?text=%C2%A1Feliz%20cumple%2C%20Mart%C3%ADn!%20%F0%9F%8E%89'`; `waLink('Hola', '099123456')` → `'https://wa.me/59899123456?text=Hola'`
  - `fotoDelDia(['a','b','c'], '2026-11-22')` equals itself on the same day, differs between consecutive days, `[]` → `null`
- [ ] **Step 2: Run** `pnpm test tests/unit` → FAIL.
- [ ] **Step 3: Implement** with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' })` for today; date math on UTC-noon `Date`s; `fotoDelDia` index = days since epoch `% length`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: date, phone and daily-photo domain logic`

---

### Task 3: Data layer (Repo, memory, Supabase, migration)

**Files:**
- Create: `src/data/repo.ts`, `src/data/memoryRepo.ts`, `src/data/supabaseRepo.ts`, `src/data/getRepo.ts`
- Already exists and is applied to the Supabase project (do not recreate): `supabase/migrations/0001_init.sql`, `0002_*.sql` — tables, RLS, bucket `archivos`, seed (config row, 4 carpetas, 6 recordatorios). SupabaseRepo must match these column names exactly. Every Contame-created entity carries `loteId` (`lote_id`) for undo.
- Test: `tests/unit/repo.contract.ts`, `tests/unit/memoryRepo.test.ts`, `tests/unit/supabaseRepo.test.ts` (runs only if `SUPABASE_TEST_URL` is set)

**Interfaces:**
- Consumes: types from Task 2.
- Produces types (add to `tipos.ts`): `Casa = 'portofino' | 'malibu'`; `PersonaCasa { id; casa; nombre; rol; detalle?; telefono? }`; `EventoCasa { id; casa; que: string; cuando: string; creadoEn: string }`; `ServicioCasa { id; casa; clave; valor }`; `Contacto { id; nombre; tipo: 'cliente'|'proveedor'|'otro'; empresa?; telefono?; nota? }`; `Pendiente { id; texto; hecho: boolean; creadoEn }`; `Nota { id; texto; origen: 'voz'|'escrita'; creadoEn }`; `Carpeta { id; nombre }`; `Documento { id; carpetaId; titulo; path; creadoEn }`; `FotoFamiliar { id; path }`; `ClaveCifrada { id; sitio; usuario; cifrado: string; iv: string }`; `UsoIa { id; tokensIn; tokensOut; costoUsd; creadoEn }`; `Config { estiloEscritura: string; nombre: string; alertaIaEnviada: boolean; claveSalt?: string; claveModo?: 'prf'|'pin' }`.
- Produces `Repo` with, per entity `E` in {fechas, recordatorios, vencimientos, personasCasa, eventosCasa, serviciosCasa, contactos, pendientes, notas, carpetas, documentos, fotos, claves, usoIa}: `list<E>(filtro?)`, `get(id)`, `create(data: Omit<E,'id'>): E`, `update(id, patch): E`, `remove(id): void`; plus `getConfig(): Config`, `setConfig(patch)`, `uploadArchivo(path, blob): string`, `urlArchivo(path): string`. Exposed as `repo.fechas.list()` etc.
- Produces `getRepo(): Repo` and `MemoryRepo.seed()` loading the 6 default yearly reminders from the spec and folders Seguros, Escrituras, Autos, Personales.

- [ ] **Step 1: Write a contract test suite** `repoContract(makeRepo)`: create→list→get→update→remove round-trip for each entity; `eventosCasa.list({casa:'portofino'})` returns only Portofino, newest `cuando` first; `seed()` yields 6 recordatorios (titles exactly as spec) and 4 carpetas; config defaults `{ nombre: 'Alfredo', alertaIaEnviada: false }`.
- [ ] **Step 2: Run** against MemoryRepo → FAIL.
- [ ] **Step 3: Implement** MemoryRepo (Maps + `crypto.randomUUID()`, `seed()` mirroring the SQL seed) and SupabaseRepo (service role key, camelCase ↔ snake_case, storage bucket `archivos`, signed URLs for `urlArchivo`).
- [ ] **Step 4: Run** `pnpm test` → PASS (Supabase suite skipped without env).
- [ ] **Step 5: Commit** `feat: repo interface with memory and supabase backends`

---

### Task 4: Auth — passkey login, sessions, family mode

**Files:**
- Create: `src/auth/session.ts`, `src/auth/access.ts`, `src/auth/passkeys.ts`, `src/middleware.ts`, `src/app/entrar/page.tsx`, `src/app/configurar/page.tsx`, `src/app/familia/page.tsx`, `src/app/api/auth/[...accion]/route.ts`
- Test: `tests/unit/access.test.ts`, `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `Repo` (add entity `passkeys { id; credentialId; publicKey; counter; transports }`).
- Produces: `type Rol = 'owner' | 'familia'`; `getSesion(): Promise<{ rol: Rol } | null>`; `puedeVer(rol: Rol | null, path: string, ahora: Date): boolean`; owner-only page `/configurar` (register passkey with `SETUP_CODE`); `/familia?codigo=…` creates a `familia` session if code matches and `ahora < FAMILY_EXPIRES_AT`.
- Access matrix: owner → everything. familia → `/`, `/calendario`, `/recordatorios`, `/casas`, `/fotos`, and their API routes; anything else redirects to `/`. Family sessions die at `FAMILY_EXPIRES_AT`. No session → `/entrar`.

- [ ] **Step 1: Write failing unit tests** for `puedeVer`: owner sees `/claves`; familia sees `/calendario` and `/casas`; familia denied `/claves`, `/documentos`, `/contactos`, `/vencimientos`, `/mensajes`, `/contame`, `/api/ai/mensajes`; familia denied everything at `2026-11-26T00:00:00-03:00`; null denied `/`.
- [ ] **Step 2: Write failing e2e** `auth.spec.ts` using Playwright CDP `WebAuthn.addVirtualAuthenticator` (Chromium project): visit `/` → redirected to `/entrar`; `/configurar` with setup code registers passkey; log out; "Entrar con Face ID" logs in and shows Inicio; `/familia?codigo=WRONG` stays out; correct code reaches `/calendario` and `/claves` redirects to `/`.
- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** with `@simplewebauthn/*` (rpID from `NEXT_PUBLIC_RP_ID`, userVerification `required`), `iron-session` cookie (`SESSION_SECRET`, 180-day owner, family until expiry), middleware calling `puedeVer`.
- [ ] **Step 5: Run** `pnpm test && pnpm e2e auth` → PASS.
- [ ] **Step 6: Commit** `feat: passkey login and family mode access control`

---

### Task 5: App shell and Inicio

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/components/ui.tsx` (Card, Chip, Field, Sheet, EmptyState, Boton), `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`
- Test: `tests/unit/BottomNav.test.tsx`, `tests/e2e/inicio.spec.ts`

**Interfaces:**
- Consumes: `proximosCumples`, `vencimientosProximos`, `fotoDelDia`, `hoyMontevideo`, `getRepo`.
- Produces: `<BottomNav activo="inicio"|"calendario"|"contame"|"mensajes"|"casas" />` (center button = link to `/contame`, `aria-label="Hablar con el asistente"`); UI primitives used by every later screen.

- [ ] **Step 1: Failing tests**: BottomNav renders 4 labeled links + the center mic link and marks the active one with `aria-current="page"`; e2e (memory repo seeded with one cumple in 3 days, one vencimiento in 5 days, 3 pendientes, 2 fotos): greeting contains "Alfredo", "Lo próximo" lists "Cumple de" + "En 3 días", "En 5 días", "3 pendientes"; shortcuts Vencimientos, Pendientes, Documentos, Contraseñas, Contactos navigate; with an empty repo, Inicio shows EmptyState text instead of breaking; family session hides the five shortcuts.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** matching the mockup's Inicio. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: app shell, bottom nav and home`

---

### Task 6: Calendario and birthday greeting

**Files:**
- Create: `src/app/(app)/calendario/page.tsx`, `src/app/(app)/calendario/Saludo.tsx`, `src/app/(app)/calendario/NuevaFecha.tsx`, `src/domain/saludos.ts`
- Test: `tests/unit/saludos.test.ts`, `tests/e2e/calendario.spec.ts`

**Interfaces:**
- Consumes: `proximosCumples`, `waLink`, `repo.fechas`.
- Produces: `saludos(nombre: string): Record<'calido'|'formal'|'corto', string>` with the exact texts: cálido `¡Feliz cumple, {nombre}! Que lo pases bárbaro. Un abrazo grande.`, formal `Muy feliz cumpleaños, {nombre}. Te deseo un gran año, con salud y alegría.`, corto `¡Feliz cumple, {nombre}! Que se cumplan todos tus deseos.`

- [ ] **Step 1: Failing tests**: `saludos('Martín').calido` equals the exact text; e2e: next birthday card shows name + "en N días"; switching tone changes the textarea; editing the textarea then tapping "Enviar por WhatsApp" opens a URL equal to `waLink(editedText)` (assert the `href`); "Copiar" writes to clipboard (grant permission in Playwright); adding a fecha with name + day/month makes it appear under its month; month groups ordered from the current month.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: calendar with editable WhatsApp birthday greetings`

---

### Task 7: Recordatorios del año

**Files:**
- Create: `src/app/(app)/recordatorios/page.tsx`, `src/app/api/recordatorios/[id]/route.ts`
- Test: `tests/e2e/recordatorios.spec.ts`

**Interfaces:**
- Consumes: `recordatoriosActivos`, `posponer`, `resolver`, `repo.recordatorios`.
- Produces: `POST /api/recordatorios/:id` body `{ accion: 'posponer' | 'resolver' }` → updated `Recordatorio`.

- [ ] **Step 1: Failing e2e** (clock fixed to `2026-10-26` via `TEST_TODAY` env read by `hoyMontevideo` callers in test mode): "Gestionar Navidad" shows as active with "Posponer 15 días" and "Resuelto"; Posponer hides it and shows "Te lo recuerdo de nuevo en 15 días."; Resuelto hides it and shows "¡Listo!"; list "Se repiten todos los años" shows the 6 seeded items with their "X antes" chip; creating one with "1 mes antes" saves `avisarDiasAntes: 30`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: yearly reminders with snooze and resolve`

---

### Task 8: Vencimientos, Pendientes y notas

**Files:**
- Create: `src/app/(app)/vencimientos/page.tsx`, `src/app/(app)/pendientes/page.tsx`
- Test: `tests/e2e/vencimientos.spec.ts`, `tests/e2e/pendientes.spec.ts`

**Interfaces:**
- Consumes: `vencimientosProximos`, `repo.vencimientos`, `repo.pendientes`, `repo.notas`.

- [ ] **Step 1: Failing e2e**: vencimientos grouped "Empresa" / "Personales", chip "En N días", urgent ones (≤ 7) use the urgent colors; marking one "hecho" removes it; pendientes: add by typing + Enter, tick moves it to done (struck through), notes list shows origin "Nota de voz" or "Escrita" with date.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: due dates, to-dos and notes`

---

### Task 9: Contactos

**Files:**
- Create: `src/app/(app)/contactos/page.tsx`, `src/app/(app)/contactos/NuevoContacto.tsx`
- Test: `tests/e2e/contactos.spec.ts`

**Interfaces:**
- Consumes: `repo.contactos`, `normalizarTelUY`, `telLink`, `waLink`.

- [ ] **Step 1: Failing e2e**: search filters by name or empresa (case- and accent-insensitive: "martin" finds "Martín"); type filter chips; contact with phone shows Llamar (`tel:+59899…`) and WhatsApp (`https://wa.me/59899…`); contact without phone hides both; saving an invalid phone shows "Revisá el número".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: key contacts`

---

### Task 10: Portofino y Malibú

**Files:**
- Create: `src/app/(app)/casas/page.tsx` (query `?casa=portofino|malibu`), `src/app/(app)/casas/Seccion*.tsx`
- Test: `tests/e2e/casas.spec.ts`

**Interfaces:**
- Consumes: `repo.personasCasa`, `repo.eventosCasa`, `repo.serviciosCasa`, `telLink`.

- [ ] **Step 1: Failing e2e**: default Portofino; switching to Malibú changes title and shows only Malibú data; "Quién se ocupa" rows with call button; "Historial" newest first with date; "Servicios" key/value; add buttons for each section persist; family session can view and add here.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: houses Portofino and Malibú`

---

### Task 11: Documentos y fotos familiares

**Files:**
- Create: `src/app/(app)/documentos/page.tsx`, `src/app/(app)/documentos/[carpetaId]/page.tsx`, `src/app/(app)/fotos/page.tsx`, `src/app/api/archivos/route.ts`
- Test: `tests/e2e/documentos.spec.ts`

**Interfaces:**
- Consumes: `repo.carpetas`, `repo.documentos`, `repo.fotos`, `repo.uploadArchivo`, `repo.urlArchivo`.
- Produces: `POST /api/archivos` (multipart: `file`, `tipo: 'documento'|'foto'`, `carpetaId?`, `titulo?`) → created entity. Client compresses to max 1600px / 0.8 quality before upload (`browser-image-compression`); input uses `accept="image/*" capture="environment"`.

- [ ] **Step 1: Failing e2e**: create folder "Barco" appears in grid; upload a fixture JPG with title "Póliza auto" → thumbnail + title + date shown; tap opens full-size view; upload without title is rejected with "Poné un título"; `/fotos` uploads family photos used by Inicio (family session allowed).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (MemoryRepo stores blobs in a Map and serves via `/api/archivos/:path`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: document folders and family photos`

---

### Task 12: AI core and budget

**Files:**
- Create: `src/ai/client.ts`, `src/ai/presupuesto.ts`, `src/ai/email.ts`
- Test: `tests/unit/presupuesto.test.ts`

**Interfaces:**
- Produces:
  - `interface AiClient { completar(args: { sistema: string; mensajes: {rol:'user'|'assistant'; texto:string}[]; maxTokens: number; herramientas?: unknown[] }): Promise<{ texto: string; toolInput?: unknown; tokensIn: number; tokensOut: number }> }` — `AnthropicClient` impl and `FakeAiClient` (scripted responses) for tests.
  - `class SinSaldoError extends Error` with message `Se terminó el saldo de la IA, avisale a Diego.`
  - `usarIa<T>(repo: Repo, ai: AiClient, email: EmailSender, args) : Promise<respuesta>` — throws `SinSaldoError` before calling when `gastoTotal >= AI_BUDGET_USD`; after the call records `UsoIa` with `costoUsd = tokensIn/1e6*PRICE_IN + tokensOut/1e6*PRICE_OUT`; when total crosses `AI_ALERT_USD` and `!config.alertaIaEnviada`, sends one email to `ALERT_EMAIL` (subject `App Alfredo: queda poco saldo de IA`) and sets the flag.
  - `interface EmailSender { enviar(to, asunto, texto): Promise<void> }` — Resend impl + fake.

- [ ] **Step 1: Failing tests** (prices 3 and 15 per MTok in test env): one call 1000 in / 500 out records `costoUsd = 0.0105`; crossing 16 sends exactly one email across two further calls; at 20 the AI client is not called and `SinSaldoError` is thrown; email failure does not fail the AI call (logged, flag stays false so it retries next time).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: AI client with budget tracking and low-credit alert`

---

### Task 13: Mensajes

**Files:**
- Create: `src/ai/mensajes.ts`, `src/app/(app)/mensajes/page.tsx`, `src/app/api/ai/mensajes/route.ts`
- Test: `tests/unit/mensajes.test.ts`, `tests/e2e/mensajes.spec.ts`

**Interfaces:**
- Consumes: `usarIa`, `config.estiloEscritura`, `config.nombre`, `waLink`.
- Produces: `POST /api/ai/mensajes` body `{ modo: 'responder', mensaje: string, variante?: 'formal'|'otra' } | { modo: 'escribir', destinatario: string, idea: string, variante? }` → `{ texto: string }` or `{ error: string }` (status 200 with the SinSaldoError message).
- System prompt fixes: write in Uruguayan Spanish as Alfredo, using his style notes, ready to paste in WhatsApp, no preamble, no quotes, max ~80 words, never invent facts not in the input, use placeholders like [nombre] only if the name is unknown.

- [ ] **Step 1: Failing tests**: prompt builder includes the style notes and the pasted message verbatim; response is trimmed and stripped of surrounding quotes; e2e with FakeAiClient: "Me escribieron" → suggestion shown with Copiar / Enviar por WhatsApp (`href` = `waLink(texto)`) / Más formal / Otra; "Quiero escribir" fields → suggestion; out-of-credit shows the friendly message, no crash.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: AI reply and compose messages`

---

### Task 14: Contame (voice inbox)

**Files:**
- Create: `src/voz/useDictado.ts`, `src/ai/contame.ts`, `src/app/(app)/contame/page.tsx`, `src/app/api/ai/contame/route.ts`, `src/app/api/contame/deshacer/route.ts`
- Test: `tests/unit/useDictado.test.ts`, `tests/unit/contame.test.ts`, `tests/e2e/contame.spec.ts`

**Interfaces:**
- Consumes: `usarIa`, all repos, `normalizarTelUY`.
- Produces:
  - `useDictado({ lang = 'es-UY' }) → { soportado: boolean; escuchando: boolean; texto: string; empezar(): void; terminar(): void; borrar(): void; error?: string }` — `continuous: true`, `interimResults: true`; on `onend` while the user has not tapped terminar, restart (new instance if `start()` throws); ignore `no-speech`/`aborted`; `not-allowed` stops and sets `error = 'Falta el permiso del micrófono'`. If unsupported, the page shows a textarea ("Escribí o dictá con el teclado").
  - `type Accion = { tipo: 'eventoCasa'; casa; que; cuando } | { tipo: 'personaCasa'; casa; nombre; rol; detalle?; telefono? } | { tipo: 'servicioCasa'; casa; clave; valor } | { tipo: 'pendiente'; texto } | { tipo: 'nota'; texto } | { tipo: 'contacto'; … } | { tipo: 'fecha'; … } | { tipo: 'recordatorio'; … } | { tipo: 'vencimiento'; … }`
  - `clasificar(texto, contexto) → { acciones: Accion[] } | { pregunta: string; opciones: { etiqueta: string; respuesta: string }[] }` via Claude tool use (one tool `guardar` whose input is the union above, one tool `preguntar`). Contexto = all PersonaCasa (name, role, house), contactos names, today's date.
  - `POST /api/ai/contame` `{ texto, respuestas?: string[] }` → `{ guardado: { accion: Accion; id: string; descripcion: string }[]; loteId: string } | { pregunta, opciones } | { error }`. `POST /api/contame/deshacer` `{ loteId }` removes every entity of that batch.
- Rules in the system prompt: one action per fact; dates relative to today in Montevideo; a person known in one house → that house without asking; a role existing in both houses or an unknown place → ask "¿Es en Portofino, en Malibú, o es otra cosa?" with "Otra cosa · guardar en Pendientes"; anything not classifiable → pendiente.

- [ ] **Step 1: Failing unit tests**: `useDictado` with a fake `webkitSpeechRecognition` — two `onresult` finals across an automatic `onend` restart accumulate into one text; `terminar()` stops restarting; `not-allowed` sets the error. `contame` with FakeAiClient scripted tool calls: "Le pagué a Simón" with Simón = jardinero Portofino → one `eventoCasa` Portofino; "le pagué al jardinero" with gardeners in both houses → returns the pregunta with three opciones; answering "Malibú" → `eventoCasa` Malibú; two facts → two actions; deshacer removes both.
- [ ] **Step 2: Failing e2e** (fake recognition injected via `addInitScript`, FakeAiClient): tap mic → speak → tap → "Lo que entendí · podés corregirlo" editable → edit → Enviar → question buttons → choose → "Listo, lo guardé:" with ✓ lines → Deshacer restores; the saved event appears in `/casas`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** → PASS.
- [ ] **Step 6: Commit** `feat: Contame voice inbox with AI filing and undo`

---

### Task 15: Notificaciones push y cron diario

**Files:**
- Create: `src/avisos/calcular.ts`, `src/avisos/push.ts`, `public/sw.js`, `src/app/(app)/ajustes/page.tsx`, `src/app/api/push/suscribir/route.ts`, `src/app/api/cron/avisos/route.ts`, `vercel.json`
- Test: `tests/unit/avisos.test.ts`

**Interfaces:**
- Consumes: `proximosCumples`, `recordatoriosActivos`, `vencimientosProximos`, `hoyMontevideo`, repo (add entity `suscripciones { id; endpoint; p256dh; auth }`).
- Produces: `avisosDelDia(datos, hoy): { titulo: string; cuerpo: string; url: string }[]` — cumple today (`Hoy cumple {nombre}`), cumple tomorrow (`Mañana cumple {nombre}`), each active recordatorio (`{titulo}` / `Faltan {dias} días`), each vencimiento with `dias <= avisarDiasAntes` (`Vence {titulo}`). `GET /api/cron/avisos` requires `Authorization: Bearer ${CRON_SECRET}`; sends each aviso to each subscription via `web-push` (VAPID keys in env); deletes subscriptions that return 404/410. `vercel.json` cron `0 12 * * *` (09:00 Montevideo). Ajustes page: "Activar avisos" button (only shown when installed: `display-mode: standalone`; otherwise instructions "Compartir › Agregar a inicio").

- [ ] **Step 1: Failing tests**: `avisosDelDia` for `hoy = '2026-11-24'` with cumple `11-25` → "Mañana cumple…"; on `11-25` → "Hoy cumple…"; recordatorio Navidad on `2026-10-26` included; resolved one excluded; cron route without secret → 401; with secret and FakePush → one send per aviso per subscription; a 410 deletes the subscription.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: daily push notifications`

---

### Task 16: Contraseñas cifradas

**Files:**
- Create: `src/claves/cripto.ts`, `src/app/(app)/claves/page.tsx`, `src/app/api/claves/route.ts`
- Test: `tests/unit/cripto.test.ts`, `tests/e2e/claves.spec.ts`

**Interfaces:**
- Consumes: `repo.claves`, `config.claveSalt`, `config.claveModo`, passkey helpers from Task 4.
- Produces (browser, Web Crypto):
  - `derivarClavePrf(prfOutput: ArrayBuffer, salt: Uint8Array): Promise<CryptoKey>` (HKDF-SHA256 → AES-GCM 256)
  - `derivarClavePin(pin: string, salt: Uint8Array): Promise<CryptoKey>` (PBKDF2-SHA256, 600000 iterations → AES-GCM 256)
  - `cifrar(key, texto): Promise<{ cifrado: string; iv: string }>` (base64, random 12-byte IV) · `descifrar(key, { cifrado, iv }): Promise<string>`
  - Unlock flow: WebAuthn `get` with `extensions: { prf: { eval: { first: salt } } }`; if `getClientExtensionResults().prf?.results?.first` exists → `claveModo = 'prf'`, else first-time setup asks a 6-digit PIN → `claveModo = 'pin'`. A known check value `"ok"` is stored encrypted in config to detect a wrong PIN ("PIN incorrecto"). Key lives only in memory; lock on `visibilitychange` hidden, route change, or 120 s idle.
  - `/api/claves` stores and returns only `{ id, sitio, usuario, cifrado, iv }`.

- [ ] **Step 1: Failing unit tests**: encrypt→decrypt round-trip; two encryptions of the same text produce different `iv` and `cifrado`; wrong PIN key fails to decrypt (throws); PRF-derived key from the same input is stable.
- [ ] **Step 2: Failing e2e** (virtual authenticator; PIN path since Chromium virtual authenticator may lack PRF): locked screen "Desbloquear con Face ID" → PIN setup → add "Banco" → list shows masked value → Copiar puts the plaintext in the clipboard → reload shows locked again; network log of `/api/claves` never contains the plaintext.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** → PASS.
- [ ] **Step 6: Commit** `feat: encrypted passwords unlocked with Face ID`

---

### Task 17: Ajustes, estilo de escritura y cierre

**Files:**
- Modify: `src/app/(app)/ajustes/page.tsx`
- Create: `tests/e2e/recorrido.spec.ts`, `docs/deploy.md`

**Interfaces:**
- Consumes: everything.
- Produces: Ajustes fields "Cómo te saludan" (`config.nombre`) and "Cómo escribís" (`config.estiloEscritura`, textarea with 3–4 real example messages), link to generate the family link (shows URL with `FAMILY_CODE`, owner only).

- [ ] **Step 1: Failing e2e `recorrido.spec.ts`** (iPhone 14 project, memory repo seeded): full happy path — login → Inicio → Calendario send greeting → Recordatorios resolve → Contame files a fact into Portofino → Mensajes reply → Documentos upload → Contraseñas add → Contactos call link → back to Inicio; every page has no console errors and no horizontal scroll at 390px width.
- [ ] **Step 2: Run** → FAIL where pieces are missing; fix. **Step 3: Run** `pnpm test && pnpm e2e` → all PASS.
- [ ] **Step 4: Write `docs/deploy.md`**: Supabase project `jtvcfwjixvbyzcbhcwkl` already has the schema and seed (migrations in `supabase/migrations`); Vercel env vars list (every var named in Global Constraints and Tasks 4, 12, 15); VAPID key generation (`npx web-push generate-vapid-keys`); first-time setup on his iPhone: open URL in Safari → Compartir › Agregar a inicio → open from the icon → /configurar with SETUP_CODE → Face ID → Ajustes › Activar avisos.
- [ ] **Step 5: Commit** `test: full journey e2e and deploy guide`

---

## Manual checks on a real iPhone (Diego, after Task 17)

- [ ] Installed from Safari, opens full screen with the icon.
- [ ] Face ID login and Contraseñas unlock (confirm PRF path on iOS 18; otherwise PIN).
- [ ] Contame dictation in installed mode: pauses don't cut the text.
- [ ] A test push arrives (temporarily call the cron route by hand).
- [ ] "Enviar por WhatsApp" opens WhatsApp with the text and the contact picker.
- [ ] Camera opens from Documentos.
