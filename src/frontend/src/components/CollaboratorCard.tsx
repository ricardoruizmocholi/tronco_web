import { useState } from 'react'
import type { Collaborator } from '../api/collaborators'

interface Props {
  collaborator: Collaborator
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M10 14L21 3" />
    </svg>
  )
}

export default function CollaboratorCard({ collaborator }: Props) {
  const { name, logo_url, description, url } = collaborator
  const [imageHovered, setImageHovered] = useState(false)

  function handleClick() {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="relative w-full flex flex-col border border-ink/10 bg-white cursor-pointer
        transition-transform duration-200 hover:-translate-y-1"
    >
      {/* Imagen — ratio 3:4, igual que LandingProductCard */}
      <div
        className="relative block w-full aspect-[3/4] overflow-hidden flex-shrink-0"
        onMouseEnter={() => setImageHovered(true)}
        onMouseLeave={() => setImageHovered(false)}
      >
        {logo_url ? (
          <img src={logo_url} alt={name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#1C1F1A' }}>
            <span className="text-white font-editorial text-4xl">{name.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Overlay hover — "VISITAR TIENDA" */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
            imageHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-xs uppercase tracking-widest" style={{ color: '#FAFAF8' }}>
            Visitar tienda
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="relative w-full min-h-[92px] overflow-hidden px-2.5 py-2 flex flex-col justify-between gap-1">
        <span className="font-editorial text-sm text-ink leading-tight line-clamp-2">{name}</span>

        {description && (
          <span className="text-xs text-ink/50 leading-tight line-clamp-2">{description}</span>
        )}

        <span className="flex items-center gap-1 text-ink/40 text-[10px] uppercase tracking-wide">
          <ExternalLinkIcon />
          Enlace externo
        </span>
      </div>
    </div>
  )
}
