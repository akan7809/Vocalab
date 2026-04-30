import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeadsFilters from '@/components/leads/LeadsFilters'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: 'En attente',     color: '#8B949E', bg: 'rgba(139,148,158,0.12)' },
  calling:        { label: 'En appel',       color: '#00E5FF', bg: 'rgba(0,229,255,0.10)' },
  called:         { label: 'Appelé',         color: '#E6EDF3', bg: 'rgba(230,237,243,0.08)' },
  interested:     { label: 'Intéressé',      color: '#00FF88', bg: 'rgba(0,255,136,0.10)' },
  not_interested: { label: 'Non intéressé',  color: '#FF6B6B', bg: 'rgba(255,107,107,0.10)' },
  callback:       { label: 'Rappel',         color: '#FFB347', bg: 'rgba(255,179,71,0.10)' },
  converted:      { label: 'Converti',       color: '#00FF88', bg: 'rgba(0,255,136,0.15)' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; industry?: string; city?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  const sp    = await searchParams
  const filterStatus   = sp.status   ?? ''
  const filterIndustry = sp.industry ?? ''
  const filterCity     = sp.city     ?? ''
  const page           = Math.max(1, parseInt(sp.page ?? '1', 10))
  const from           = (page - 1) * PAGE_SIZE
  const to             = from + PAGE_SIZE - 1

  // Count total (for pagination)
  let countQuery = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (filterStatus)   countQuery = countQuery.eq('status', filterStatus)
  if (filterIndustry) countQuery = countQuery.eq('industry', filterIndustry)
  if (filterCity)     countQuery = countQuery.ilike('city', `%${filterCity}%`)

  const { count: total = 0 } = await countQuery

  // Fetch page
  let query = supabase
    .from('leads')
    .select('id, company_name, contact_name, phone, city, industry, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (filterStatus)   query = query.eq('status', filterStatus)
  if (filterIndustry) query = query.eq('industry', filterIndustry)
  if (filterCity)     query = query.ilike('city', `%${filterCity}%`)

  const { data: leads = [] } = await query
  const totalPages = Math.ceil((total ?? 0) / PAGE_SIZE)

  // Build pagination URL helper
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (filterStatus)   params.set('status', filterStatus)
    if (filterIndustry) params.set('industry', filterIndustry)
    if (filterCity)     params.set('city', filterCity)
    params.set('page', String(p))
    return `/leads?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>Leads</h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Prospects importés dans votre base</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leads/import"
            className="text-sm px-4 py-2 rounded-lg transition-all"
            style={{ color: '#8B949E', border: '1px solid #1A2332' }}
          >
            Importer des leads
          </Link>
          <Link
            href="/leads/scrape"
            className="text-sm px-4 py-2 rounded-lg font-bold transition-all"
            style={{ backgroundColor: '#00E5FF', color: '#080C10' }}
          >
            ✨ Scraper avec Apify
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border px-5 py-3"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
      >
        <LeadsFilters
          status={filterStatus}
          industry={filterIndustry}
          city={filterCity}
          total={total ?? 0}
        />
      </div>

      {/* Table / Empty state */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        {(leads?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}
            >
              📋
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: '#E6EDF3' }}>Aucun lead importé</p>
              <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
                {filterStatus || filterIndustry || filterCity
                  ? 'Aucun résultat pour ces filtres'
                  : 'Lancez votre premier scraping pour remplir votre base'}
              </p>
            </div>
            {!filterStatus && !filterIndustry && !filterCity && (
              <Link
                href="/leads/scrape"
                className="text-sm px-5 py-2.5 rounded-lg font-bold mt-2"
                style={{ backgroundColor: '#00E5FF', color: '#080C10' }}
              >
                ✨ Lancer un scraping →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2332' }}>
                  {['Entreprise', 'Contact', 'Téléphone', 'Ville', 'Secteur', 'Statut', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-normal whitespace-nowrap" style={{ color: '#8B949E' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads?.map((lead, i) => {
                  const st = STATUS_CONFIG[lead.status ?? 'pending'] ?? STATUS_CONFIG.pending
                  return (
                    <tr
                      key={lead.id}
                      style={{ borderBottom: i < (leads?.length ?? 0) - 1 ? '1px solid #1A2332' : 'none' }}
                    >
                      <td className="px-5 py-3 font-medium max-w-[180px] truncate" style={{ color: '#E6EDF3' }}>
                        {lead.company_name ?? '—'}
                      </td>
                      <td className="px-5 py-3" style={{ color: '#8B949E' }}>
                        {lead.contact_name ?? '—'}
                      </td>
                      <td className="px-5 py-3 font-mono" style={{ color: '#8B949E' }}>
                        {lead.phone ?? '—'}
                      </td>
                      <td className="px-5 py-3" style={{ color: '#8B949E' }}>
                        {lead.city ?? '—'}
                      </td>
                      <td className="px-5 py-3" style={{ color: '#8B949E' }}>
                        {lead.industry ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap"
                          style={{ color: st.color, backgroundColor: st.bg }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: '#8B949E' }}>
                        {fmtDate(lead.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs" style={{ color: '#8B949E' }}>
            Page {page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ color: '#8B949E', border: '1px solid #1A2332' }}
              >
                ← Précédent
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <Link
                  key={p}
                  href={pageUrl(p)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: p === page ? '#00E5FF' : 'transparent',
                    color:           p === page ? '#080C10' : '#8B949E',
                    border:          p === page ? 'none' : '1px solid #1A2332',
                  }}
                >
                  {p}
                </Link>
              )
            })}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ color: '#8B949E', border: '1px solid #1A2332' }}
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
