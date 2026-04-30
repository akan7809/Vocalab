import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-2"
      style={{ backgroundColor: '#0D1117', borderColor: accent ? 'rgba(0,229,255,0.3)' : '#1A2332' }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: '#8B949E' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ fontFamily: 'monospace', color: accent ? '#00E5FF' : '#E6EDF3' }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: '#8B949E' }}>{sub}</p>}
    </div>
  )
}

const OUTCOME_LABEL: Record<string, { label: string; color: string }> = {
  interested:     { label: 'Intéressé',     color: '#00FF88' },
  not_interested: { label: 'Non intéressé', color: '#8B949E' },
  callback:       { label: 'Rappel',        color: '#00E5FF' },
  converted:      { label: 'Converti',      color: '#00FF88' },
  no_answer:      { label: 'Sans réponse',  color: '#FF6B6B' },
}

function fmtDuration(s: number) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m${sec.toString().padStart(2, '0')}s`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Page ───────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organizations(name, plan, minutes_included, minutes_used, agents_limit)')
    .eq('id', user.id)
    .single()

  const org   = (profile?.organizations as any) ?? {}
  const orgId = profile?.organization_id

  const [agentsRes, leadsRes, callsRes, campaignsRes, rdvRes] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name, status')
      .eq('organization_id', orgId)
      .eq('status', 'active'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('calls')
      .select('id, created_at, duration_seconds, outcome, agents(name), leads(contact_name, company_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('campaigns')
      .select('id, name, status, leads_total, leads_called, leads_interested, leads_converted')
      .eq('organization_id', orgId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false }),
    supabase
      .from('campaigns')
      .select('rdv_validated, revenue_generated')
      .eq('organization_id', orgId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const activeAgents    = agentsRes.data?.length ?? 0
  const totalLeads      = leadsRes.count ?? 0
  const recentCalls     = callsRes.data ?? []
  const activeCampaigns = campaignsRes.data ?? []
  const rdvTotal        = rdvRes.data?.reduce((s, r) => s + (r.rdv_validated ?? 0), 0) ?? 0
  const revenueTotal    = rdvRes.data?.reduce((s, r) => s + (r.revenue_generated ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Vue d&apos;ensemble de votre activité Vocalab</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Agents actifs"
          value={`${activeAgents} / ${org.agents_limit ?? 1}`}
          sub="agents vocaux déployés"
          accent={activeAgents > 0}
        />
        <KpiCard
          label="Minutes utilisées"
          value={org.minutes_used ?? 0}
          sub={`sur ${org.minutes_included ?? 300} incluses`}
        />
        <KpiCard
          label="Leads en base"
          value={totalLeads.toLocaleString('fr-FR')}
          sub="prospects importés"
        />
        <KpiCard
          label="RDV ce mois"
          value={rdvTotal}
          sub={revenueTotal > 0 ? `${revenueTotal.toLocaleString('fr-FR')} € générés` : 'aucun revenu ce mois'}
          accent={rdvTotal > 0}
        />
      </div>

      {/* ── Derniers appels ── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1A2332' }}>
          <h2 className="text-sm font-bold" style={{ color: '#E6EDF3' }}>Derniers appels</h2>
          <span className="text-xs" style={{ color: '#8B949E' }}>5 derniers</span>
        </div>
        {recentCalls.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: '#8B949E' }}>
            Aucun appel enregistré pour l&apos;instant.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #1A2332' }}>
                {['Date', 'Agent', 'Lead', 'Durée', 'Résultat'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-normal" style={{ color: '#8B949E' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call, i) => {
                const outcome = OUTCOME_LABEL[call.outcome ?? ''] ?? { label: '—', color: '#8B949E' }
                return (
                  <tr
                    key={call.id}
                    style={{ borderBottom: i < recentCalls.length - 1 ? '1px solid #1A2332' : 'none' }}
                  >
                    <td className="px-5 py-3" style={{ color: '#8B949E' }}>{fmtDate(call.created_at)}</td>
                    <td className="px-5 py-3" style={{ color: '#E6EDF3' }}>{(call.agents as any)?.name ?? '—'}</td>
                    <td className="px-5 py-3" style={{ color: '#E6EDF3' }}>
                      {(call.leads as any)?.contact_name ?? (call.leads as any)?.company_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: '#8B949E' }}>{fmtDuration(call.duration_seconds)}</td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ color: outcome.color, backgroundColor: `${outcome.color}15` }}
                      >
                        {outcome.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Campagnes actives ── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1A2332' }}>
          <h2 className="text-sm font-bold" style={{ color: '#E6EDF3' }}>Campagnes actives</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,229,255,0.08)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.15)' }}
          >
            {activeCampaigns.length} en cours
          </span>
        </div>
        {activeCampaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: '#8B949E' }}>
            Aucune campagne active. Créez votre première campagne.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1A2332' }}>
            {activeCampaigns.map(c => {
              const pct = c.leads_total > 0 ? Math.round((c.leads_called / c.leads_total) * 100) : 0
              const statusColor = c.status === 'active' ? '#00FF88' : c.status === 'paused' ? '#00E5FF' : '#8B949E'
              return (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-bold truncate" style={{ color: '#E6EDF3' }}>{c.name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1A2332' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: '#00E5FF' }}
                        />
                      </div>
                      <span className="text-xs shrink-0" style={{ color: '#8B949E' }}>
                        {c.leads_called}/{c.leads_total} appels
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#00FF88' }}>{c.leads_interested}</p>
                    <p className="text-xs" style={{ color: '#8B949E' }}>intéressés</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
