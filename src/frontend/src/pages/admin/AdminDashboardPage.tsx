import { Link } from 'react-router-dom'

const CARDS = [
  {
    title: 'Productos',
    description: 'Gestiona el catálogo de merchandising: precios, stock e imágenes.',
    href: '/admin/productos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119
             1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h13a1.125
             1.125 0 011.119 1.007z" />
      </svg>
    ),
  },
  {
    title: 'Artistas',
    description: 'Añade o edita artistas colaboradores, galería e imágenes de perfil.',
    href: '/admin/artistas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118
             0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375
             9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0
             .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375
             0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
  {
    title: 'Fanfics',
    description: 'Modera los fanfics enviados por usuarios: aprueba o rechaza con motivo.',
    href: '/admin/fanfics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12
             21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515
             3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843
             4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686
             0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
      </svg>
    ),
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Panel de administración</h1>
      <p className="text-ink/50 text-sm mb-10">Gestiona el contenido de Troncodrilo Shop.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {CARDS.map(card => (
          <Link
            key={card.href}
            to={card.href}
            className="group flex items-start gap-5 p-6 bg-white rounded-2xl border
              border-ink/10 hover:border-primary/40 hover:shadow-md transition-all duration-200"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary
              flex items-center justify-center group-hover:bg-primary group-hover:text-white
              transition-colors">
              {card.icon}
            </div>
            <div>
              <p className="font-semibold text-ink group-hover:text-primary transition-colors mb-1">
                {card.title}
              </p>
              <p className="text-sm text-ink/50 leading-relaxed">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
