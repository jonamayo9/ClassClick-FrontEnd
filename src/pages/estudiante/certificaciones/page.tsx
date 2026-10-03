import { CertificacionesPanel } from '../certificaciones-panel'

export function EstudianteCertificacionesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-200">Portal del alumno</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Certificaciones</h1>
          <p className="mt-1 text-sm text-violet-200">Solicitá tus certificados al finalizar una cursada.</p>
        </div>
      </section>

      <CertificacionesPanel />
    </div>
  )
}