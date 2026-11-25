import { Field, clasesFechaHora, clasesInput, clasesSelect } from './ui'
import { MESES } from '@/domain/validarFecha'
import { telParaEditar } from '@/domain/telefono'

/**
 * Campos de las hojas de agregar y editar (ronda 6). Los mismos en "Para completar" y en cada lista, así la hoja
 * de editar es igual a la de agregar, con los datos cargados.
 */

/** "Elegí" en gris hasta elegir (ronda 4b). */
export const clasesElegir = `${clasesSelect} invalid:text-texto-2`

/** Día y mes con "Elegí" (vacío hasta elegir); con dia/mes, ya elegidos. */
export function DiaMes({ dia, mes }: { dia?: number; mes?: number } = {}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Día">
        <select name="dia" aria-label="Día" defaultValue={dia ?? ''} required className={clasesElegir}>
          <option value="" disabled>Elegí</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </Field>
      <Field label="Mes">
        <select name="mes" aria-label="Mes" defaultValue={mes ?? ''} required className={clasesElegir}>
          <option value="" disabled>Elegí</option>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </Field>
    </div>
  )
}

/** "MM-DD" → { dia, mes } para DiaMes. */
export function diaMesDe(mmdd: string | null | undefined): { dia?: number; mes?: number } {
  if (!mmdd) return {}
  const [mes, dia] = mmdd.split('-').map(Number)
  return { dia, mes }
}

/** Cumpleaños: nombre, día, mes y año de nacimiento opcional. */
export function CamposCumple({ nombre = '', dia, anio }: { nombre?: string; dia?: string | null; anio?: number }) {
  return (
    <>
      <Field label="Nombre"><input name="nombre" defaultValue={nombre} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      <DiaMes {...diaMesDe(dia)} />
      <Field label="Año de nacimiento (opcional)">
        <input name="anio" defaultValue={anio ?? ''} inputMode="numeric" pattern="[0-9]*" maxLength={4} className={clasesInput} />
      </Field>
    </>
  )
}

/** Servicio de una casa: nombre y número (o dato). */
export function CamposServicio({ clave = '', valor = '', enfocarDato = false }: { clave?: string; valor?: string | null; enfocarDato?: boolean }) {
  return (
    <>
      <Field label="Servicio" hint="Por ejemplo DirecTV"><input name="clave" defaultValue={clave} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Dato" hint="Por ejemplo Cliente 123456">
        <input name="valor" defaultValue={valor ?? ''} maxLength={500} autoFocus={enfocarDato} className={clasesInput} autoComplete="off" />
      </Field>
    </>
  )
}

/** "Quién se ocupa": nombre, qué hace, qué días va y teléfono. */
export function CamposPersona({ nombre = '', rol = '', detalle = '', telefono, enfocarTelefono = false }: {
  nombre?: string; rol?: string; detalle?: string; telefono?: string; enfocarTelefono?: boolean
}) {
  return (
    <>
      <Field label="Nombre"><input name="nombre" defaultValue={nombre} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Qué hace" hint="Por ejemplo Limpieza o Jardín"><input name="rol" defaultValue={rol} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Qué días va" hint="Por ejemplo los jueves"><input name="detalle" defaultValue={detalle} maxLength={500} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Teléfono" hint="Por ejemplo 099 123 456">
        <input name="telefono" defaultValue={telParaEditar(telefono)} type="tel" inputMode="tel" autoFocus={enfocarTelefono} className={clasesInput} autoComplete="off" />
      </Field>
    </>
  )
}

/** Historial de una casa: qué pasó y cuándo. */
export function CamposEvento({ que = '', cuando }: { que?: string; cuando: string }) {
  return (
    <>
      <Field label="¿Qué pasó?"><textarea name="que" defaultValue={que} maxLength={2000} rows={4} className={`${clasesInput} py-3`} /></Field>
      <Field label="Fecha"><input name="cuando" type="date" defaultValue={cuando} className={clasesFechaHora} /></Field>
    </>
  )
}

export interface DatosContacto { nombre?: string; grupoId?: string; empresa?: string; telefono?: string; nota?: string }

/** Contacto: nombre, grupo, empresa, teléfono y nota. */
export function CamposContacto({ c = {}, grupos, enfocarTelefono = false }: {
  c?: DatosContacto; grupos: { id: string; nombre: string }[]; enfocarTelefono?: boolean
}) {
  return (
    <>
      <Field label="Nombre"><input name="nombre" defaultValue={c.nombre ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      {grupos.length > 0 && (
        <Field label="Grupo (opcional)">
          <select name="grupo" defaultValue={c.grupoId ?? ''} className={clasesSelect}>
            <option value="">Sin grupo</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </Field>
      )}
      <Field label="Empresa"><input name="empresa" defaultValue={c.empresa ?? ''} maxLength={80} className={clasesInput} autoComplete="off" /></Field>
      <Field label="Teléfono" hint="Por ejemplo 099 123 456">
        <input name="telefono" defaultValue={telParaEditar(c.telefono)} type="tel" inputMode="tel" autoFocus={enfocarTelefono} className={clasesInput} autoComplete="off" />
      </Field>
      <Field label="Nota"><textarea name="nota" defaultValue={c.nota ?? ''} maxLength={2000} rows={3} className={`${clasesInput} py-3`} /></Field>
    </>
  )
}

/** FormData → lo que esperan las acciones de contacto. */
export const entradaContacto = (f: FormData) => {
  const s = (k: string) => String(f.get(k) ?? '')
  return { nombre: s('nombre'), grupoId: s('grupo'), empresa: s('empresa'), telefono: s('telefono'), nota: s('nota') }
}
