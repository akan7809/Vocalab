import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AgentForm from '@/components/agents/AgentForm'

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('organization_id', profile?.organization_id)
    .single()

  if (!agent) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-xs transition-all" style={{ color: '#8B949E' }}>
          ← Agents
        </Link>
        <span style={{ color: '#1A2332' }}>/</span>
        <span className="text-xs" style={{ color: '#E6EDF3' }}>{agent.name}</span>
      </div>

      <div>
        <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>Modifier l&apos;agent</h1>
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>{agent.name}</p>
      </div>

      <AgentForm
        agentId={id}
        submitLabel="Sauvegarder les modifications"
        initial={{
          name:         agent.name,
          type:         agent.type,
          language:     agent.language ?? 'fr',
          industry:     agent.industry ?? '',
          objective:    agent.objective ?? '',
          first_message: agent.first_message ?? '',
          system_prompt: agent.system_prompt ?? '',
          voice_id:     agent.voice_id ?? 'sophie',
        }}
      />
    </div>
  )
}
