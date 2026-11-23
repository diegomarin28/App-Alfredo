import { useEffect, useId, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

type CampoTexto = HTMLInputElement | HTMLTextAreaElement
const nada = () => () => {}

/**
 * Estado de un campo de texto que no pierde lo escrito antes de que React enganche la página (un teléfono
 * lento). Al hidratar, React deja en un <input> lo escrito pero no avisa por onChange, y a un <textarea> con
 * texto inicial lo vuelve al texto del servidor. Por eso, mientras hidrata, se lee lo que ya tiene el campo
 * (antes de que React lo toque) y, ya enganchada la página, pasa al estado. El primer render es igual al del
 * servidor, para que la hidratación coincida. Devuelve [texto, setTexto, props para el campo].
 */
export function useTextoEscrito(inicial: string): [string, Dispatch<SetStateAction<string>>, { 'data-campo': string }] {
  const id = useId()
  // false en el servidor y mientras React hidrata (usa el snapshot del servidor); true al montar después.
  const montado = useSyncExternalStore(nada, () => true, () => false)
  const [texto, setTexto] = useState(inicial)
  const [escrito] = useState(() => {
    if (montado || typeof document === 'undefined') return null
    return document.querySelector<CampoTexto>(`[data-campo="${id}"]`)?.value ?? null
  })
  useEffect(() => {
    if (escrito !== null && escrito !== inicial) setTexto(escrito)
    // solo al enganchar la página: después los cambios llegan por onChange
  }, [])
  return [texto, setTexto, { 'data-campo': id }]
}
