import Link from 'next/link'
import AgentForm from '@/components/agents/AgentForm'

export default function NewAgentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-xs transition-all" style={{ color: '#8B949E' }}>
          ← Agents
        </Link>
        <span style={{ color: '#1A2332' }}>/</span>
        <span className="text-xs" style={{ color: '#E6EDF3' }}>Nouvel agent</span>
      </div>

      <div>
        <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>Créer un agent vocal</h1>
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
          Configurez votre agent en 3 étapes — moins de 5 minutes
        </p>
      </div>

      <AgentForm submitLabel="Créer l'agent →" />
    </div>
  )
}
