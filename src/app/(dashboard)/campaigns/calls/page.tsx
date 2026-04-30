import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CallsCampaignClient from '@/components/campaigns/CallsCampaignClient'

export const dynamic = 'force-dynamic'

export default async function CallsCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id

  // Leads pending avec téléphone
  const { data: leads = [] } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, phone, city, industry')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .not('phone', 'is', null)
    .neq('phone', '')
    .order('created_at', { ascending: false })
    .limit(200)

  // Agents actifs outbound
  const { data: agents = [] } = await supabase
    .from('agents')
    .select('id, name, type, status')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .eq('type', 'outbound')
    .order('created_at', { ascending: false })

  const totalLeads  = leads?.length  ?? 0
  const totalAgents = agents?.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-xs" style={{ color: '#8B949E' }}>← Leads</Link>
        <span style={{ color: '#1A2332' }}>/</span>
        <span className="text-xs" style={{ color: '#E6EDF3' }}>Campagne appels</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>
            🎙️ Campagne appels IA
          </h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            Lancez des appels outbound via Vapi + ElevenLabs
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#00E5FF', fontFamily: 'monospace' }}>
              {totalLeads}
            </p>
            <p className="text-xs" style={{ color: '#8B949E' }}>leads avec tél.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: totalAgents > 0 ? '#00FF88' : '#FF6B6B', fontFamily: 'monospace' }}>
              {totalAgents}
            </p>
            <p className="text-xs" style={{ color: '#8B949E' }}>agents actifs</p>
          </div>
        </div>
      </div>

      {/* Info stack */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '📞', title: 'Vapi',        desc: 'Infrastructure d\'appels IA' },
          { icon: '🗣️',  title: 'ElevenLabs',  desc: 'Voix naturelle ultra-réaliste' },
          { icon: '🤖', title: 'Claude AI',   desc: 'Intelligence conversationnelle' },
        ].map(item => (
          <div key={item.title} className="rounded-xl border p-4"
            style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
            <p className="text-lg mb-1">{item.icon}</p>
            <p className="text-xs font-bold" style={{ color: '#E6EDF3' }}>{item.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Warning si aucun agent actif */}
      {totalAgents === 0 && (
        <div className="rounded-xl border p-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(255,179,71,0.06)', borderColor: 'rgba(255,179,71,0.3)' }}>
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#FFB347' }}>Aucun agent vocal actif</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
              <Link href="/agents" className="underline">Activez un agent outbound</Link> pour lancer des appels.
            </p>
          </div>
        </div>
      )}

      <CallsCampaignClient leads={leads ?? []} agents={agents ?? []} />
    </div>
  )
}
