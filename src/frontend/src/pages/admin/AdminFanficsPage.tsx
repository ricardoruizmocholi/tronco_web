import { useEffect, useState } from 'react'
import { approveFanfic, getAdminFanfics, rejectFanfic } from '../../api/fanfics'
import type { Fanfic, FanficStatus } from '../../types/fanfic'

const TABS: { key: FanficStatus; label: string }[] = [
  { key: 'pending',  label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados'  },
  { key: 'rejected', label: 'Rechazados' },
]

export default function AdminFanficsPage() {
  const [tab, setTab]         = useState<FanficStatus>('pending')
  const [fanfics, setFanfics] = useState<Fanfic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [rejectId, setRejectId]         = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  function load(status: FanficStatus) {
    setLoading(true)
    getAdminFanfics(status)
      .then(setFanfics)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  async function handleApprove(id: number) {
    setSaving(true)
    try {
      await approveFanfic(id)
      load(tab)
    } finally {
      setSaving(false)
    }
  }

  async function handleReject() {
    if (rejectId === null) return
    setSaving(true)
    try {
      await rejectFanfic(rejectId, rejectReason || undefined)
      setRejectId(null)
      setRejectReason('')
      load(tab)
    } finally {
      setSaving(false)
    }
  }

  const emptyMsg = tab === 'pending' ? 'pendientes' : tab === 'approved' ? 'aprobados' : 'rechazados'

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Moderación de fanfics</h1>
      <p className="text-ink/50 text-sm mb-8">
        Revisa, aprueba o rechaza los fanfics enviados por los usuarios.
      </p>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-ink/5 p-1 rounded-xl mb-8 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fanfics.length === 0 ? (
        <p className="text-center text-ink/40 py-20 text-sm">
          No hay fanfics {emptyMsg}.
        </p>
      ) : (
        <div className="space-y-4">
          {fanfics.map(fanfic => (
            <div key={fanfic.id} className="bg-white rounded-2xl border border-ink/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink truncate">{fanfic.title}</h3>
                  <p className="text-sm text-ink/50 mt-0.5">
                    {fanfic.author?.name}
                    {fanfic.author?.email ? ` · ${fanfic.author.email}` : ''}
                  </p>
                  <p className="text-sm text-ink/70 mt-3 line-clamp-3 leading-relaxed">
                    {fanfic.content}
                  </p>
                  {fanfic.rejection_reason && (
                    <p className="text-xs text-secondary mt-2 italic">
                      Motivo anterior: {fanfic.rejection_reason}
                    </p>
                  )}
                </div>

                {tab === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(fanfic.id)}
                      disabled={saving}
                      className="px-4 py-2 bg-primary text-white text-sm rounded-xl
                        hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectId(fanfic.id); setRejectReason('') }}
                      disabled={saving}
                      className="px-4 py-2 bg-secondary/10 text-secondary text-sm rounded-xl
                        hover:bg-secondary/20 disabled:opacity-50 transition-colors font-medium"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de rechazo ── */}
      {rejectId !== null && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center
            justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setRejectId(null) }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-semibold text-ink mb-1">Rechazar fanfic</h3>
            <p className="text-sm text-ink/50 mb-4">
              Motivo opcional — el usuario lo verá en su panel de Mi fanfic.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="El contenido no cumple las normas de la comunidad..."
              className="w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm text-ink
                focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectId(null)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 bg-secondary text-white text-sm rounded-xl
                  hover:bg-secondary/90 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
