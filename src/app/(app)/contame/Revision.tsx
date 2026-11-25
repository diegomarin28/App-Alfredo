'use client'
import { useState } from 'react'
import { Boton, Card, CampoSelect, Field, IconoTile, Lista, Sheet, clasesFechaHora, clasesFila, clasesInput, clasesSelect } from '@/components/ui'
import { Segmentado } from '@/components/controles'
import { clasesElegir } from '@/components/campos'
import { Icono, type NombreIcono } from '@/components/iconos'
import { MESES } from '@/domain/validarFecha'
import { MAX_PENDIENTE } from '@/domain/vencimientos'
import {
  aplicarEdicion, edicionDe, etiquetaTexto, fechaQuePide, filaPropuesta, SECCIONES_CONTAME,
  type Accion, type Edicion, type FechaEdicion, type SeccionContame,
} from '@/ai/acciones'

export interface FilaRevision { id: string; accion: Accion }
export interface DudaRevision { id: string; texto: string; comoNota: boolean }

const ICONO: Record<Accion['tipo'], [NombreIcono, 'azul' | 'naranja' | 'verde' | 'gris']> = {
  eventoCasa: ['casa', 'verde'], personaCasa: ['casa', 'verde'], servicioCasa: ['casa', 'verde'],
  vencimiento: ['reloj', 'naranja'], pendiente: ['tilde', 'gris'], nota: ['mensaje', 'gris'],
  contacto: ['personas', 'azul'], fecha: ['torta', 'azul'], recordatorio: ['campana', 'naranja'],
}

const dos = (n: number) => String(n).padStart(2, '0')
const LARGOS: SeccionContame[] = ['nota', 'eventoPortofino', 'eventoMalibu']

/** Ronda 7: lo que no entendió se corrige con la misma hoja; arranca como tarea (o nota, si es largo). */
const accionDeDuda = (d: DudaRevision): Accion => (d.texto.length <= MAX_PENDIENTE ? { tipo: 'pendiente', texto: d.texto } : { tipo: 'nota', texto: d.texto })

type Editando = { fila: FilaRevision } | { duda: DudaRevision }

/** Hoja para corregir una fila: el texto, la fecha y a qué sección va. */
function EditarFila({ accion, hoy, onListo }: { accion: Accion; hoy: string; onListo: (a: Accion) => void }) {
  const inicial = edicionDe(accion, hoy)
  const [e, setE] = useState<Edicion>(inicial)
  const [error, setError] = useState('')
  const pide = fechaQuePide(e.seccion)
  const anioHoy = Number(hoy.slice(0, 4))
  const cambiar = (c: Partial<Edicion>) => { setError(''); setE((x) => ({ ...x, ...c })) }
  const cambiarFecha = (c: Partial<FechaEdicion>) => setE((x) => {
    const f = { anio: x.fecha?.anio ?? anioHoy, mes: x.fecha?.mes ?? NaN, dia: x.fecha?.dia ?? NaN, ...c }
    return { ...x, fecha: Number.isNaN(f.mes) && Number.isNaN(f.dia) ? null : f }
  })
  const iso = e.fecha && !Number.isNaN(e.fecha.mes) && !Number.isNaN(e.fecha.dia) ? `${e.fecha.anio}-${dos(e.fecha.mes)}-${dos(e.fecha.dia)}` : ''

  function guardar(ev: React.FormEvent) {
    ev.preventDefault()
    const f = e.fecha && (Number.isNaN(e.fecha.mes) || Number.isNaN(e.fecha.dia)) ? null : e.fecha
    const r = aplicarEdicion(accion, { ...e, fecha: f }, hoy)
    if (!r.ok) { setError(r.error); return }
    onListo(r.accion)
  }

  const etiqueta = etiquetaTexto(e.seccion)
  return (
    <form onSubmit={guardar} className="space-y-4" noValidate>
      <CampoSelect id="revision-seccion" label="Va en">
        {(p) => (
          <select {...p} value={e.seccion} onChange={(x) => cambiar({ seccion: x.target.value as SeccionContame })} className={clasesSelect}>
            {SECCIONES_CONTAME.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        )}
      </CampoSelect>
      <Field label={etiqueta}>
        {LARGOS.includes(e.seccion)
          ? <textarea value={e.texto} onChange={(x) => cambiar({ texto: x.target.value })} rows={3} maxLength={5000} className={`${clasesInput} py-3`} />
          : <input value={e.texto} onChange={(x) => cambiar({ texto: x.target.value })} maxLength={200} autoComplete="off" className={clasesInput} />}
      </Field>
      {(e.seccion === 'personaPortofino' || e.seccion === 'personaMalibu') && (
        <Field label="Qué hace" hint="Por ejemplo Limpieza o Jardín">
          <input value={e.rol ?? ''} onChange={(x) => cambiar({ rol: x.target.value })} maxLength={80} autoComplete="off" className={clasesInput} />
        </Field>
      )}
      {(e.seccion === 'servicioPortofino' || e.seccion === 'servicioMalibu') && (
        <Field label="Dato (opcional)" hint="Por ejemplo Cliente 123456">
          <input value={e.valor ?? ''} onChange={(x) => cambiar({ valor: x.target.value })} maxLength={500} autoComplete="off" className={clasesInput} />
        </Field>
      )}
      {(pide === 'completa' || pide === 'completaOpcional') && (
        <Field label={pide === 'completaOpcional' ? 'Para cuándo (opcional)' : 'Fecha'}>
          <input
            type="date" value={iso} className={clasesFechaHora}
            onChange={(x) => {
              const [a, m, d] = x.target.value.split('-').map(Number)
              cambiar({ fecha: x.target.value ? { anio: a, mes: m, dia: d } : null })
            }}
          />
        </Field>
      )}
      {e.seccion === 'unaVez' && (
        <Field label="Hora (opcional)">
          <input type="time" value={e.hora ?? ''} onChange={(x) => cambiar({ hora: x.target.value })} className={clasesFechaHora} />
        </Field>
      )}
      {(pide === 'diaMes' || pide === 'diaMesOpcional') && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={pide === 'diaMesOpcional' ? 'Día (opcional)' : 'Día'}>
            <select aria-label="Día" value={e.fecha && !Number.isNaN(e.fecha.dia) ? e.fecha.dia : ''} required onChange={(x) => { setError(''); cambiarFecha({ dia: x.target.value ? Number(x.target.value) : NaN }) }} className={clasesElegir}>
              <option value="">Elegí</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </Field>
          <Field label={pide === 'diaMesOpcional' ? 'Mes (opcional)' : 'Mes'}>
            <select aria-label="Mes" value={e.fecha && !Number.isNaN(e.fecha.mes) ? e.fecha.mes : ''} required onChange={(x) => { setError(''); cambiarFecha({ mes: x.target.value ? Number(x.target.value) : NaN }) }} className={clasesElegir}>
              <option value="">Elegí</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-urg-bg p-3 text-base text-urg-tx">{error}</p>}
      <Boton type="submit" className="w-full">Listo</Boton>
    </form>
  )
}

/**
 * "Esto es lo que entendí" (ronda 6): Contame revisa antes de guardar. Cada ítem es una fila; tocarla la corrige
 * y la ✕ la saca. Lo que no entendió va aparte, con "Guardar como nota" o "Descartar" (por defecto, descartar).
 */
export default function Revision({ filas, setFilas, dudas, setDudas, aviso, hoy, cargando, onGuardar, onCancelar }: {
  filas: FilaRevision[]; setFilas: (f: FilaRevision[]) => void
  dudas: DudaRevision[]; setDudas: (d: DudaRevision[]) => void
  aviso: string | null; hoy: string; cargando: boolean
  onGuardar: (acciones: Accion[]) => void; onCancelar: () => void
}) {
  const [editando, setEditando] = useState<Editando | null>(null)
  const acciones = [...filas.map((f) => f.accion), ...dudas.filter((d) => d.comoNota).map((d): Accion => ({ tipo: 'nota', texto: d.texto }))]
  const vacio = filas.length === 0 && dudas.length === 0

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-texto">Esto es lo que entendí</h2>
        {!vacio && <p className="text-base text-texto-2">Tocá una fila para corregirla. Nada se guarda hasta que toques &quot;Guardar todo&quot;.</p>}
      </div>
      {aviso && <p role="status" className="rounded-2xl bg-urg-bg p-4 text-base text-urg-tx">{aviso}</p>}
      {vacio && <Card><p className="text-base text-texto-2">No encontré nada para guardar.</p></Card>}

      {filas.length > 0 && (
        <Lista aria-label="Lo que voy a guardar">
          {filas.map((f) => {
            const { seccion, texto } = filaPropuesta(f.accion)
            // un cumpleaños, la torta; una reunión o un aniversario, el calendario
            const [icono, tono] = f.accion.tipo === 'fecha' && f.accion.tipoFecha === 'otra' ? ['calendario', 'azul'] as const : ICONO[f.accion.tipo]
            return (
              <li key={f.id} data-fila className={`${clasesFila} pr-1.5 motion-safe:animate-entrar`}>
                <button type="button" aria-label={`Corregir: ${texto}`} onClick={() => setEditando({ fila: f })} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left">
                  <IconoTile nombre={icono} tono={tono} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold break-words text-texto">{texto}</span>
                    <span className="block text-base text-texto-2">{seccion}</span>
                  </span>
                </button>
                <button
                  type="button" aria-label={`Sacar: ${texto}`} onClick={() => setFilas(filas.filter((x) => x.id !== f.id))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-texto-2"
                >
                  <Icono nombre="cerrar" tamano={20} trazo={2} />
                </button>
              </li>
            )
          })}
        </Lista>
      )}

      {dudas.length > 0 && (
        <Lista aria-label="Lo que no entendí">
          {dudas.map((d) => (
            <li key={d.id} data-duda className={`space-y-2.5 px-4 py-3 border-borde [&:not(:first-child)]:border-t`}>
              {/* ronda 7: tocarla deja editar el texto y elegir a qué sección va */}
              <button type="button" aria-label={`Corregir: ${d.texto}`} onClick={() => setEditando({ duda: d })} className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left">
                <span className="min-w-0 flex-1 text-base break-words text-texto"><span className="font-semibold">No entendí:</span> «{d.texto}»</span>
                <span className="mt-0.5 shrink-0 text-texto-2"><Icono nombre="lapiz" tamano={18} /></span>
              </button>
              <Segmentado
                etiqueta={`Qué hago con «${d.texto.slice(0, 40)}»`}
                opciones={[['descartar', 'Descartar'], ['nota', 'Guardar como nota']] as const}
                valor={d.comoNota ? 'nota' : 'descartar'}
                onCambio={(v) => setDudas(dudas.map((x) => (x.id === d.id ? { ...x, comoNota: v === 'nota' } : x)))}
              />
            </li>
          ))}
        </Lista>
      )}

      <div className="flex flex-col gap-3">
        {!vacio && <Boton className="w-full" disabled={cargando || acciones.length === 0} onClick={() => onGuardar(acciones)}>Guardar todo</Boton>}
        <Boton variante="suave" className="w-full" disabled={cargando} onClick={onCancelar}>{vacio ? 'Contar otra cosa' : 'Cancelar'}</Boton>
      </div>

      <Sheet abierto={editando !== null} onCerrar={() => setEditando(null)} titulo="Corregir">
        {editando && 'fila' in editando && (
          <EditarFila
            key={editando.fila.id} accion={editando.fila.accion} hoy={hoy}
            onListo={(a) => { setFilas(filas.map((x) => (x.id === editando.fila.id ? { ...x, accion: a } : x))); setEditando(null) }}
          />
        )}
        {editando && 'duda' in editando && (
          <EditarFila
            key={editando.duda.id} accion={accionDeDuda(editando.duda)} hoy={hoy}
            // ya sabe dónde va: pasa a "Lo que voy a guardar"
            onListo={(a) => { setDudas(dudas.filter((x) => x.id !== editando.duda.id)); setFilas([...filas, { id: editando.duda.id, accion: a }]); setEditando(null) }}
          />
        )}
      </Sheet>
    </div>
  )
}
