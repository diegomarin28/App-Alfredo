'use client'
import { Chip, clasesInput, clasesSelect } from '@/components/ui'
import { OPCIONES_AVISO, UNIDADES_AVISO, type UnidadAviso } from '@/domain/avisoDias'

export { OPCIONES_AVISO, claveAviso, diasAviso, otroDesdeDias } from '@/domain/avisoDias'

/** Selector "Avisarme con": 1 día / 3 días / 1 semana / 1 mes / 2 meses / Otro (N días, semanas o meses). */
export default function AvisoChips({ aviso, setAviso, otro, setOtro, unidad, setUnidad }: {
  aviso: string; setAviso: (v: string) => void; otro: string; setOtro: (v: string) => void
  unidad: UnidadAviso; setUnidad: (v: UnidadAviso) => void
}) {
  return (
    <div role="group" aria-label="Avisarme con" className="space-y-2">
      <p className="text-base font-semibold">Avisarme con</p>
      <div className="flex flex-wrap gap-2">
        {OPCIONES_AVISO.map((o) => (
          <Chip key={o.clave} activo={aviso === o.clave} aria-pressed={aviso === o.clave} onClick={() => setAviso(o.clave)}>{o.texto}</Chip>
        ))}
        <Chip activo={aviso === 'otro'} aria-pressed={aviso === 'otro'} onClick={() => setAviso('otro')}>Otro</Chip>
      </div>
      {aviso === 'otro' && (
        <div className="grid grid-cols-2 gap-3">
          <input
            aria-label="Cantidad" value={otro} onChange={(e) => setOtro(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={3}
            className={clasesInput}
          />
          <select aria-label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadAviso)} className={clasesSelect}>
            {UNIDADES_AVISO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
