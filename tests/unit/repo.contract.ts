import { describe, expect, it } from 'vitest'
import type { Repo, Entidad } from '@/data/repo'

const uid = () => crypto.randomUUID()

interface Ctx { repo: Repo; carpetaId: string }
interface Caso {
  entidad: Entidad
  /** campos para crear */
  nuevo: (c: Ctx) => Record<string, unknown>
  /** cambio a aplicar con update */
  patch: Record<string, unknown>
}

const CASOS: Caso[] = [
  { entidad: 'fechas', nuevo: () => ({ nombre: 'Test', tipo: 'cumple', dia: '03-04', anioNacimiento: 1960 }), patch: { nombre: 'Test 2', dia: '05-06' } },
  { entidad: 'recordatorios', nuevo: () => ({ titulo: 'Test', dia: '01-02', avisarDiasAntes: 30 }), patch: { titulo: 'Test 2', pospuestoHasta: '2026-12-01', resueltoAnio: 2026 } },
  { entidad: 'vencimientos', nuevo: () => ({ titulo: 'Test', ambito: 'empresa', fecha: '2026-12-01', avisarDiasAntes: 7, hecho: false }), patch: { hecho: true } },
  { entidad: 'personasCasa', nuevo: () => ({ casa: 'malibu', nombre: 'Juan', rol: 'Jardinero', telefono: '099123456' }), patch: { detalle: 'Los martes' } },
  { entidad: 'eventosCasa', nuevo: () => ({ casa: 'malibu', que: 'Se rompió la bomba', cuando: '2026-10-01' }), patch: { que: 'Arreglaron la bomba' } },
  { entidad: 'serviciosCasa', nuevo: () => ({ casa: 'portofino', clave: 'wifi', valor: 'abc' }), patch: { valor: 'xyz' } },
  { entidad: 'contactos', nuevo: () => ({ nombre: 'Ana', tipo: 'cliente', empresa: 'ACME' }), patch: { tipo: 'proveedor', nota: 'llamar' } },
  { entidad: 'pendientes', nuevo: () => ({ texto: 'Comprar', hecho: false }), patch: { hecho: true } },
  { entidad: 'notas', nuevo: () => ({ texto: 'Idea', origen: 'escrita' }), patch: { texto: 'Idea 2' } },
  { entidad: 'carpetas', nuevo: () => ({ nombre: `Carpeta ${uid()}` }), patch: { nombre: `Renombrada ${uid()}` } },
  { entidad: 'documentos', nuevo: (c) => ({ carpetaId: c.carpetaId, titulo: 'Póliza', path: 'documentos/x.jpg' }), patch: { titulo: 'Póliza 2' } },
  { entidad: 'fotos', nuevo: () => ({ path: 'fotos/x.jpg' }), patch: { path: 'fotos/y.jpg' } },
  { entidad: 'claves', nuevo: () => ({ sitio: 'banco', usuario: 'diego', cifrado: 'AAAA', iv: 'BBBB' }), patch: { cifrado: 'CCCC' } },
  { entidad: 'passkeys', nuevo: () => ({ credentialId: `cred-${uid()}`, publicKey: 'cGstZGUtcHJ1ZWJh', counter: 0, transports: ['internal', 'hybrid'] }), patch: { counter: 7 } },
  { entidad: 'suscripciones', nuevo: () => ({ endpoint: `https://push.example/${uid()}`, p256dh: 'BPkey', auth: 'authkey' }), patch: { auth: 'otra' } },
  { entidad: 'usoIa', nuevo: () => ({ tokensIn: 10, tokensOut: 20, costoUsd: 0.000123 }), patch: { tokensOut: 30 } },
]

export function repoContract(nombre: string, makeRepo: () => Promise<Repo>, opts: { skip?: boolean } = {}) {
  describe.skipIf(opts.skip)(`Repo contract: ${nombre}`, () => {
    describe.each(CASOS)('$entidad', ({ entidad, nuevo, patch }) => {
      it('create → list → get → update → remove', async () => {
        const repo = await makeRepo()
        const carpeta = await repo.carpetas.create({ nombre: `Carpeta ${uid()}` })
        const t = repo[entidad] as unknown as {
          list(f?: object): Promise<{ id: string; creadoEn?: string }[]>
          get(id: string): Promise<object | null>
          create(d: object): Promise<{ id: string; creadoEn?: string }>
          update(id: string, p: object): Promise<object>
          remove(id: string): Promise<void>
        }
        const datos = nuevo({ repo, carpetaId: carpeta.id })
        const creado = await t.create(datos)
        try {
          expect(creado.id).toBeTruthy()
          expect(creado).toMatchObject(datos)
          expect(creado.creadoEn).toBeTruthy()
          expect((await t.list()).map((x) => x.id)).toContain(creado.id)
          expect(await t.get(creado.id)).toEqual(creado)
          const act = await t.update(creado.id, patch)
          expect(act).toMatchObject({ ...datos, ...patch, id: creado.id })
          expect(await t.get(creado.id)).toEqual(act)
        } finally {
          await t.remove(creado.id)
          await repo.carpetas.remove(carpeta.id)
        }
        expect(await t.get(creado.id)).toBeNull()
        expect((await t.list()).map((x) => x.id)).not.toContain(creado.id)
        await expect(t.remove(creado.id)).resolves.toBeUndefined()
      })
    })

    it('list filtra por igualdad y eventosCasa viene del más nuevo al más viejo', async () => {
      const repo = await makeRepo()
      const loteId = uid()
      const mk = (casa: 'portofino' | 'malibu', que: string, cuando: string) =>
        repo.eventosCasa.create({ casa, que, cuando, loteId })
      const a = await mk('portofino', 'viejo', '2026-01-10')
      const b = await mk('portofino', 'nuevo', '2026-09-10')
      const c = await mk('malibu', 'otra casa', '2026-12-01')
      const d = await mk('portofino', 'medio', '2026-05-10')
      try {
        const lista = await repo.eventosCasa.list({ casa: 'portofino', loteId })
        expect(lista.map((e) => e.que)).toEqual(['nuevo', 'medio', 'viejo'])
        expect((await repo.eventosCasa.list({ loteId })).map((e) => e.que)).toEqual(['otra casa', 'nuevo', 'medio', 'viejo'])
        expect(await repo.eventosCasa.list({ loteId: uid() })).toEqual([])
      } finally {
        for (const e of [a, b, c, d]) await repo.eventosCasa.remove(e.id)
      }
    })

    it('el resto de las listas sale en orden de creación', async () => {
      const repo = await makeRepo()
      const loteId = uid()
      const ids: string[] = []
      for (const texto of ['uno', 'dos', 'tres']) ids.push((await repo.pendientes.create({ texto, hecho: false, loteId })).id)
      try {
        expect((await repo.pendientes.list({ loteId })).map((p) => p.texto)).toEqual(['uno', 'dos', 'tres'])
      } finally {
        for (const id of ids) await repo.pendientes.remove(id)
      }
    })

    it('update con null borra el campo opcional', async () => {
      const repo = await makeRepo()
      const r = await repo.recordatorios.create({ titulo: 'Test', dia: '01-02', avisarDiasAntes: 30, pospuestoHasta: '2026-12-01', resueltoAnio: 2026 })
      try {
        const act = await repo.recordatorios.update(r.id, { pospuestoHasta: null, resueltoAnio: null, titulo: 'Test 2' })
        expect(act.titulo).toBe('Test 2')
        expect(act).not.toHaveProperty('pospuestoHasta')
        expect(act).not.toHaveProperty('resueltoAnio')
        expect(await repo.recordatorios.get(r.id)).toEqual(act)
      } finally {
        await repo.recordatorios.remove(r.id)
      }
    })

    it('update con dia null en un recordatorio conserva null (no borra la clave)', async () => {
      const repo = await makeRepo()
      const r = await repo.recordatorios.create({ titulo: 'Test', dia: '01-02', avisarDiasAntes: 30 })
      try {
        const act = await repo.recordatorios.update(r.id, { dia: null })
        expect(act.dia).toBeNull()
        expect((await repo.recordatorios.get(r.id))?.dia).toBeNull()
      } finally {
        await repo.recordatorios.remove(r.id)
      }
    })

    it('update de algo que no existe falla', async () => {
      const repo = await makeRepo()
      await expect(repo.pendientes.update(uid(), { hecho: true })).rejects.toThrow()
    })

    it('trae los 6 recordatorios y las 4 carpetas iniciales', async () => {
      const repo = await makeRepo()
      const recs = await repo.recordatorios.list()
      for (const [titulo, dia, dias] of [
        ['Gestionar fin de año', '12-31', 60],
        ['Gestionar Navidad', '12-25', 60],
        ['Cena de Navidad', '12-24', 30],
        ['Cena de Año Nuevo', '12-31', 30],
        ['Cena de mi cumpleaños', '11-25', 30],
        ['Sacar pasajes de los chicos', null, 60],
      ] as const) {
        expect(recs.find((r) => r.titulo === titulo)).toMatchObject({ dia, avisarDiasAntes: dias })
      }
      const nombres = (await repo.carpetas.list()).map((c) => c.nombre)
      expect(nombres).toEqual(expect.arrayContaining(['Seguros', 'Escrituras', 'Autos', 'Personales']))
    })

    it('config: valores por defecto y setConfig parcial', async () => {
      const repo = await makeRepo()
      const inicial = await repo.getConfig()
      expect(inicial).toMatchObject({ nombre: 'Alfredo', alertaIaEnviada: false })
      try {
        const nueva = await repo.setConfig({ estiloEscritura: 'corto', claveModo: 'pin', claveCheck: 'x', claveCheckIv: 'y' })
        expect(nueva).toMatchObject({ nombre: 'Alfredo', estiloEscritura: 'corto', claveModo: 'pin', claveCheck: 'x', claveCheckIv: 'y' })
        expect(await repo.getConfig()).toEqual(nueva)
      } finally {
        await repo.setConfig({ estiloEscritura: inicial.estiloEscritura })
      }
    })

    it('archivos: sube y da una url que contiene el path; rechaza paths fuera de fotos/ y documentos/', async () => {
      const repo = await makeRepo()
      const path = `fotos/contrato-${uid()}.txt`
      expect(await repo.uploadArchivo(path, new Blob(['hola'], { type: 'text/plain' }))).toBe(path)
      expect(await repo.urlArchivo(path)).toContain(path)
      await expect(repo.uploadArchivo('otro/x.txt', new Blob(['x']))).rejects.toThrow()
      await expect(repo.uploadArchivo('fotos/../x.txt', new Blob(['x']))).rejects.toThrow()
    })
  })
}
