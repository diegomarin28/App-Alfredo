import { FormConfigurar } from './FormConfigurar'

export default function Configurar() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-texto">Configurar Face ID</h1>
        <p className="text-texto-2">Escribí el código de configuración y después confirmá con Face ID.</p>
      </div>
      <FormConfigurar />
    </main>
  )
}
