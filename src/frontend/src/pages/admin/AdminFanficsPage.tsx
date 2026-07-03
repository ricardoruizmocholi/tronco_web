import { useEffect, useRef, useState } from 'react'
import {
  approveFanfic, blockFanficUser, featureFanfic, getAdminFanfics,
  getBlockedUsers, rejectFanfic, unblockUser, unfeatureFanfic,
} from '../../api/fanfics'
import type { BlockedUser, Fanfic, FanficStatus } from '../../types/fanfic'

const TABS: { key: FanficStatus; label: string }[] = [
  { key: 'pending',  label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados'  },
  { key: 'rejected', label: 'Rechazados' },
]

export default function AdminFanficsPage() {
  const [tab, setTab]                       = useState<FanficStatus>('pending')
  const [fanfics, setFanfics]               = useState<Fanfic[]>([])
  const [blocked, setBlocked]               = useState<BlockedUser[]>([])
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [search, setSearch]                 = useState('')
  const [featuredOnly, setFeaturedOnly]     = useState(false)
  const [rejectId, setRejectId]             = useState<number | null>(null)
  const [rejectReason, setRejectReason]     = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function load(status: FanficStatus, q = search, featured = featuredOnly) {
    setLoading(true)
    Promise.all([
      getAdminFanfics({ status, search: q || undefined, featured: featured || undefined }),
      getBlockedUsers(),
    ])
      .then(([f, b]) => { setFanfics(f); setBlocked(b) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(tab, value, featuredOnly), 350)
  }

  function handleFeaturedToggle() {
    const next = !featuredOnly
    setFeaturedOnly(next)
    load(tab, search, next)
  }

  async function handleApprove(id: number) {
    setSaving(true)
    try { await approveFanfic(id); load(tab) } finally { setSaving(false) }
  }

  async function handleReject() {
    if (rejectId === null) return
    setSaving(true)
    try {
      await rejectFanfic(rejectId, rejectReason || undefined)
      setRejectId(null); setRejectReason(''); load(tab)
    } finally { setSaving(false) }
  }

  async function handleFeature(fanfic: Fanfic) {
    setSaving(true)
    try {
      fanfic.is_featured ? await unfeatureFanfic(fanfic.id) : await featureFanfic(fanfic.id)
      load(tab)
    } finally { setSaving(false) }
  }

  async function handleBlock(fanficId: number) {
    if (!confirm('¿Bloquear a este usuario? No podrá subir contenido.')) return
    setSaving(true)
    try { await blockFanficUser(fanficId); load(tab) } finally { setSaving(false) }
  }

  async function handleUnblock(userId: number) {
    setSaving(true)
    try { await unblockUser(userId); load(tab) } finally { setSaving(false) }
  }

  const emptyMsg = tab === 'pending' ? 'pendientes' : tab === 'approved' ? 'aprobados' : 'rechazados'

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Moderación de fanfics</h1>
      <p className="text-ink/50 text-sm mb-8">
        Revisa, aprueba o rechaza las imágenes enviadas por los usuarios.
      </p>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-ink/5 p-1 rounded-xl">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por ciudad o caption..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-ink/15 bg-white text-sm
              text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <button onClick={handleFeaturedToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
            border transition-colors ${
              featuredOnly
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-ink/60 border-ink/15 hover:border-primary/40'
            }`}>
          <svg viewBox="0 0 24 24" fill={featuredOnly ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Destacados
        </button>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fanfics.length === 0 ? (
        <p className="text-center text-ink/40 py-20 text-sm">No hay fanfics {emptyMsg}.</p>
      ) : (
        <div className="space-y-4">
          {fanfics.map(fanfic => (
            <div key={fanfic.id}
              className={`bg-white rounded-2xl border p-5 flex gap-5 items-start ${
                fanfic.is_featured ? 'border-primary/30 bg-primary/[0.02]' : 'border-ink/10'
              }`}>

              {/* Miniatura */}
              <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-ink/5">
                {fanfic.image_url && (
                  <img src={fanfic.image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink">{fanfic.city_name}</p>
                  {fanfic.is_featured && (
                    <span className="text-xs font-medium text-primary bg-primary/10
                      px-2 py-0.5 rounded-full">Destacado</span>
                  )}
                </div>
                <p className="text-sm text-ink/50 mt-0.5">
                  {fanfic.author?.name}
                  {fanfic.author?.email ? ` · ${fanfic.author.email}` : ''}
                </p>
                {fanfic.caption && (
                  <p className="text-sm text-ink/70 mt-2 line-clamp-2 italic">
                    &ldquo;{fanfic.caption}&rdquo;
                  </p>
                )}
                {fanfic.rejection_reason && (
                  <p className="text-xs text-secondary mt-1 italic">
                    Motivo anterior: {fanfic.rejection_reason}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                {tab === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(fanfic.id)} disabled={saving}
                      className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg
                        hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium">
                      Aprobar
                    </button>
                    <button onClick={() => { setRejectId(fanfic.id); setRejectReason('') }}
                      disabled={saving}
                      className="px-3 py-1.5 bg-secondary/10 text-secondary text-xs rounded-lg
                        hover:bg-secondary/20 disabled:opacity-50 transition-colors font-medium">
                      Rechazar
                    </button>
                  </>
                )}
                <button onClick={() => handleFeature(fanfic)} disabled={saving}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
                    disabled:opacity-50 ${
                      fanfic.is_featured
                        ? 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}>
                  {fanfic.is_featured ? 'Quitar dest.' : 'Destacar'}
                </button>
                <button onClick={() => handleBlock(fanfic.id)} disabled={saving}
                  className="px-3 py-1.5 bg-secondary/10 text-secondary text-xs rounded-lg
                    hover:bg-secondary/20 disabled:opacity-50 transition-colors font-medium">
                  Bloquear usuario
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de rechazo ── */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center
          justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setRejectId(null) }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-semibold text-ink mb-1">Rechazar fanfic</h3>
            <p className="text-sm text-ink/50 mb-4">
              Motivo opcional — el usuario lo verá en su panel.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="El contenido no cumple las normas..."
              className="w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectId(null)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors">
                Cancelar
              </button>
              <button onClick={handleReject} disabled={saving}
                className="px-4 py-2 bg-secondary text-white text-sm rounded-xl
                  hover:bg-secondary/90 disabled:opacity-50 transition-colors font-medium">
                {saving ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Usuarios bloqueados ── */}
      {blocked.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink mb-4">
            Usuarios bloqueados
            <span className="ml-2 text-sm font-normal text-ink/40">({blocked.length})</span>
          </h2>
          <div className="space-y-2">
            {blocked.map(u => (
              <div key={u.id}
                className="flex items-center justify-between gap-4 bg-white rounded-xl
                  border border-ink/10 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{u.name}</p>
                  <p className="text-xs text-ink/40">{u.email}</p>
                </div>
                <button onClick={() => handleUnblock(u.id)} disabled={saving}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg
                    hover:bg-primary/20 disabled:opacity-50 transition-colors font-medium">
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
