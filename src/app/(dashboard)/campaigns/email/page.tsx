import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmailCampaignClient from '@/components/campaigns/EmailCampaignClient'

export const dynamic = 'force-dynamic'

export default async function EmailCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id

  // Récupère uniquement les leads avec un email valide
  const { data: leads = [] } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, email, city, industry, status')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .not('email', 'is', null)
    .neq('email', '')
    .order('created_at', { ascending: false })
    .limit(100)

  const totalWithEmail = leads?.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-xs" style={{ color: '#8B949E' }}>
          ← Leads
        </Link>
        <span style={{ color: '#1A2332' }}>/</span>
        <span className="text-xs" style={{ color: '#E6EDF3' }}>Campagne email</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>
            📧 Campagne email IA
          </h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            Génère et envoie des emails de prospection personnalisés avec Claude
          </p>
        </div>

        {/* Stats */}
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: '#00E5FF', fontFamily: 'monospace' }}>
            {totalWithEmail}
          </p>
          <p className="text-xs" style={{ color: '#8B949E' }}>leads avec email</p>
        </div>
      </div>

      {/* Info stack */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🤖', title: 'Claude AI',      desc: 'Email personnalisé par lead' },
          { icon: '📬', title: 'IONOS SMTP',      desc: 'Envoi via hello@synkros.ai' },
          { icon: '📅', title: 'Calendly',        desc: 'Lien RDV dans chaque email' },
        ].map(item => (
          <div
            key={item.title}
            className="rounded-xl border p-4"
            style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
          >
            <p className="text-lg mb-1">{item.icon}</p>
            <p className="text-xs font-bold" style={{ color: '#E6EDF3' }}>{item.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Client interactif */}
      <EmailCampaignClient leads={leads ?? []} />
    </div>
  )
}
