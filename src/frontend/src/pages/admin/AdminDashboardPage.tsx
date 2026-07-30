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
  {
    title: 'Envíos',
    description: 'Configura tarifas de envío por país, coste y umbrales de envío gratuito.',
    href: '/admin/envios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125
             1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3
             0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193
             2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422
             -1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987
             1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: 'Banners',
    description: 'Gestiona los banners hero de la home: imagen, título, CTA y orden.',
    href: '/admin/banners',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409
             a2.25 2.25 0 013.182 0l2.909 2.909M3 3.75h18A2.25 2.25 0 0121 6v12A2.25 2.25 0
             0118.75 20.25H5.25A2.25 2.25 0 013 18V6A2.25 2.25 0 015.25 3.75zm13.5 8.25a.75.75
             0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Pedidos',
    description: 'Consulta y gestiona todos los pedidos: estado, detalle, filtros y exportación.',
    href: '/admin/pedidos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    title: 'Preorders',
    description: 'Gestiona la lista de espera de productos agotados: reservas, notificaciones y exportación CSV.',
    href: '/admin/preorders',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Devoluciones',
    description: 'Gestiona solicitudes de devolución: aprueba, rechaza o marca como recibido y emite el reembolso.',
    href: '/admin/devoluciones',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
  },
  {
    title: 'Colaboradores',
    description: 'Añade marcas o tiendas colaboradoras con logo y enlace externo.',
    href: '/admin/colaboradores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0
             .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062
             6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995
             5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971
             5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25
             2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Promociones',
    description: 'Crea descuentos sobre productos: porcentaje o importe fijo, con vigencia programada.',
    href: '/admin/promociones',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581
             9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369
             -1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
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
