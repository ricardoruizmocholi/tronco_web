import { Link } from 'react-router-dom'

const navLinks = [
  { to: '/tienda',           label: 'Tienda' },
  { to: '/artistas',         label: 'Artistas' },
  { to: '/bola-troncodrilo', label: 'Bola Troncodrilo' },
  { to: '/perfil',           label: 'Mi perfil' },
]

const infoLinks = [
  { to: '/politica-privacidad',   label: 'Política de privacidad' },
  { to: '/politica-cookies',      label: 'Política de cookies' },
  { to: '/terminos-condiciones',  label: 'Términos y condiciones' },
  { to: '/politica-devoluciones', label: 'Política de devoluciones' },
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1F1A' }}>
      <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Logo + tagline */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="w-fit">
            <img src="/Troncodrilo_cabeceza_blanco.png" alt="Troncodrilo" className="h-6 w-auto" />
          </Link>
          <p className="text-canvas/50 text-sm max-w-xs">
            Merchandising oficial del cocodrilo más icónico del universo conocido.
          </p>
        </div>

        {/* Navegación */}
        <div className="flex flex-col gap-3">
          <p className="label-caps text-canvas/40 font-semibold">Navegación</p>
          <nav className="flex flex-col gap-2">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="text-canvas/70 text-sm hover:text-canvas transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Información */}
        <div className="flex flex-col gap-3">
          <p className="label-caps text-canvas/40 font-semibold">Información</p>
          <nav className="flex flex-col gap-2">
            {infoLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="text-canvas/70 text-sm hover:text-canvas transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="border-t" style={{ borderColor: 'rgba(250,250,248,0.2)' }} />
      </div>

      <p className="text-canvas/30 text-xs text-center max-w-6xl mx-auto px-4 py-6">
        © 2026 Troncodrilo. Todos los derechos reservados.
      </p>
      <p className="text-canvas/30 text-xs text-left max-w-6xl mx-auto px-4 py-6">
        Ricardo Ruiz Mocholi.
      </p>
    </footer>


  )
}
