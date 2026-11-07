import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSocialLinks } from '../api/socialLinks'
import type { SocialLink } from '../types/socialLink'
import { SOCIAL_NAMES } from '../lib/socialNames'
import SocialIcon from './SocialIcon'

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

// Defensa en profundidad: la validación real es la del servidor, pero nunca
// se pinta un href que no sea http(s) (p. ej. un registro manual en BD).
const isSafeUrl = (url: string) => /^https?:\/\//i.test(url)

export default function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    // Si falla, el bloque simplemente no se muestra
    getSocialLinks().then(setSocialLinks).catch(() => setSocialLinks([]))
  }, [])

  const visibleLinks = socialLinks.filter(l => isSafeUrl(l.url))

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

          {visibleLinks.length > 0 && (
            <ul className="flex flex-wrap -ml-3 mt-1" aria-label="Redes sociales">
              {visibleLinks.map(link => {
                const name = link.label || SOCIAL_NAMES[link.platform] || 'Red social'
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      title={name}
                      className="flex items-center justify-center w-11 h-11 text-canvas/70 hover:text-canvas transition-colors"
                    >
                      <SocialIcon platform={link.platform} />
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
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
