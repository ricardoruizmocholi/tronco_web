import { Link } from 'react-router-dom'
import { ADMIN_NAV_ITEMS } from '../../lib/adminNav'

export default function AdminDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Panel de administración</h1>
      <p className="text-ink/50 text-sm mb-10">Gestiona el contenido de Troncodrilo Shop.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {ADMIN_NAV_ITEMS.map(card => (
          <Link
            key={card.href}
            to={card.href}
            className="group flex items-start gap-5 p-6 bg-white rounded-2xl border
              border-ink/10 hover:border-primary/40 hover:shadow-md transition-all duration-200"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 text-primary
              flex items-center justify-center group-hover:bg-primary group-hover:text-white
              transition-colors">
              <span className="w-7 h-7 block">{card.icon}</span>
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
