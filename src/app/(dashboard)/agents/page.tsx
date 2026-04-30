import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AgentCard from '@/components/agents/AgentCard'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, organizations(agents_limit)')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  const limit = (profile?.organizations as any)?.agents_limit ?? 1

  console.log('AgentsPage — orgId:', orgId)

  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, type, status, language, industry, objective')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  console.log('Agents récupérés:', agents)
  if (agentsError) console.log('Agents error:', agentsError.message, agentsError.code)

  const list = agents ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>Agents vocaux</h1>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            {list.length} / {limit} agents créés
          </p>
        </div>
        <Link
          href="/agents/new"
          className="text-sm px-4 py-2 rounded-lg font-bold transition-all"
          style={{ backgroundColor: '#00E5FF', color: '#080C10' }}
        >
          + Créer un agent
        </Link>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 gap-4"
          style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}
          >
            ◎
          </div>
          <div className="text-center">
            <p className="font-bold" style={{ color: '#E6EDF3' }}>Aucun agent vocal</p>
            <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
              Créez votre premier agent vocal IA en 5 minutes
            </p>
          </div>
          <Link
            href="/agents/new"
            className="text-sm px-6 py-2.5 rounded-lg font-bold mt-2 transition-all"
            style={{ backgroundColor: '#00E5FF', color: '#080C10' }}
          >
            Créer mon premier agent →
          </Link>
        </div>
      )}

      {/* Grid */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map(agent => (
            <AgentCard key={agent.id} agent={agent as any} />
          ))}
        </div>
      )}
    </div>
  )
}
