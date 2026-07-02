import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="relative bg-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark/95 to-dark/80 z-10" />
        <div className="relative z-20 max-w-3xl mx-auto px-4 py-32 flex flex-col items-center text-center gap-8">
          <img
            src="/logo_troncodrilo.PNG"
            alt="Troncodrilo"
            className="h-28 w-auto drop-shadow-2xl"
          />
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Bienvenido al pantano
            </h1>
            <p className="text-lg text-white/60 max-w-md mx-auto">
              Merchandising oficial del cocodrilo más icónico del universo conocido.
            </p>
          </div>
          <Link
            to="/tienda"
            className="mt-2 inline-flex items-center gap-2 bg-primary text-white
              px-7 py-3 rounded-lg font-semibold text-sm hover:bg-primary/90
              transition-colors shadow-lg shadow-primary/20"
          >
            Ver tienda
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Acceso rápido */}
      <section className="max-w-4xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Tienda */}
        <Link
          to="/tienda"
          className="group relative bg-dark rounded-2xl overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="relative z-10 space-y-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">
              Merchandising
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight">La Tienda</h2>
            <p className="text-white/50 text-sm">
              Camisetas, accesorios, pósters y coleccionables del pantano.
            </p>
            <span className="inline-block text-primary text-sm font-medium mt-2
              group-hover:translate-x-1 transition-transform">
              Explorar →
            </span>
          </div>
        </Link>

        {/* Card Bola Troncodrilo */}
        <Link
          to="/bola-troncodrilo"
          className="group relative bg-dark rounded-2xl overflow-hidden
            flex flex-col justify-end p-8 min-h-[260px]
            hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
          <div className="relative z-10 space-y-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-widest">
              Mundo interactivo
            </span>
            <h2 className="text-2xl font-bold text-white leading-tight">Bola Troncodrilo</h2>
            <p className="text-white/50 text-sm">
              Sube tu fanfic y ponlo en el mapa del universo Troncodrilo.
            </p>
            <span className="inline-block text-primary text-sm font-medium mt-2
              group-hover:translate-x-1 transition-transform">
              Descubrir →
            </span>
          </div>
        </Link>
      </section>
    </div>
  )
}
