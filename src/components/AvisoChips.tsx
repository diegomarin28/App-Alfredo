'use client'
import { Chip, Field, clasesInput } from '@/components/ui'

export const OPCIONES_AVISO = [
  { clave: 'semana', texto: '1 semana', dias: 7 },
  { clave: 'mes', texto: '1 mes', dias: 30 },
  { clave: 'meses', texto: '2 meses', dias: 60 },
] as const

export function claveAviso(dias: number): string {
  return OPCIONES_AVISO.find((o) => o.dias === dias)?.clave ?? 'otro'
}

export function diasAviso(aviso: string, otro: string): number {
  return aviso === 'otro' ? Number(otro) : OPCIONES_AVISO.find((o) => o.clave === aviso)!.dias
}

/** Selector "Avisarme con": 1 semana / 1 mes / 2 meses / Otro (días a elección). */
export default function AvisoChips({ aviso, setAviso, otro, setOtro }: {
  aviso: string; setAviso: (v: string) => void; otro: string; setOtro: (v: string) => void
}) {
  return (
    <div role="group" aria-label="Avisarme con" className="space-y-2">
      <p className="text-base font-medium">Avisarme con</p>
      <div className="flex flex-wrap gap-2">
        {OPCIONES_AVISO.map((o) => (
          <Chip key={o.clave} activo={aviso === o.clave} aria-pressed={aviso === o.clave} onClick={() => setAviso(o.clave)}>{o.texto}</Chip>
        ))}
        <Chip activo={aviso === 'otro'} aria-pressed={aviso === 'otro'} onClick={() => setAviso('otro')}>Otro</Chip>
      </div>
      {aviso === 'otro' && (
        <Field label="Cantidad de días">
          <input value={otro} onChange={(e) => setOtro(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={3} className={clasesInput} />
        </Field>
      )}
    </div>
  )
}
