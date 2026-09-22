import TroncodriloGame from '../components/TroncodriloGame'

export default function MaintenancePage() {
  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4 gap-8 py-12">
      <div className="text-center">
        <h1 className="font-editorial text-3xl md:text-4xl text-ink text-balance my-6">
          Perdonad las molestias, estamos en mantenimiento
        </h1>
        <p className="text-sm text-ink/60 text-center max-w-[400px] mx-auto">
          Mientras tanto, os dejamos un jueguecito para que Troncodrilo no se aburra
        </p>
        <p className="label-caps text-ink/60 animate-pulse mt-3">
          ¡Salta sobre los troncos! — Pulsa ESPACIO o toca la pantalla
        </p>
      </div>

      <TroncodriloGame />
    </div>
  )
}
