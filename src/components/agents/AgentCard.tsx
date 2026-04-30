'use client'

import { useState } from 'react'

type Agent = {
  id: string
  name: string
  type: 'inbound' | 'outbound'
  status: 'active' | 'inactive' | 'paused'
  language: string
  industry: string | null
  objective: string | null
}

const TYPE_CONFIG = {
  inbound:  { label: 'Entrant',  color: '#00E5FF', bg: 'rgba(0,229,255,0.08)' },
  outbound: { label: 'Sortant',  color: '#00FF88', bg: 'rgba(0,255,136,0.08)' },
}

const STATUS_CONFIG = {
  active:   { label: 'Actif',   dot: '#00FF88' },
  inactive: { label: 'Inactif', dot: '#8B949E' },
  paused:   { label: 'Pausé',   dot: '#00E5FF' },
}

const LANG_LABEL: Record<string, string> = { fr: 'Français', en: 'Anglais', ar: 'Arabe' }

export default function AgentCard({ agent }: { agent: Agent }) {
  const [loading, setLoading] = useState(false)
  const type   = TYPE_CONFIG[agent.type]    ?? TYPE_CONFIG.outbound
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.inactive

  async function toggleStatus() {
    setLoading(true)
    const newStatus = agent.status === 'active' ? 'inactive' : 'active'
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      window.location.href = '/agents'
    } else {
      alert('Erreur lors de la mise à jour du statut.')
      setLoading(false)
    }
  }

  async function deleteAgent() {
    if (!window.confirm(`Supprimer l'agent "${agent.name}" ? Cette action est irréversible.`)) return
    setLoading(true)
    const res = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/agents'
    } else {
      alert('Erreur lors de la suppression.')
      setLoading(false)
    }
  }

  function editAgent() {
    window.location.href = `/agents/${agent.id}/edit`
  }

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4 transition-all"
      style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1A2332')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate" style={{ color: '#E6EDF3' }}>{agent.name}</h3>
          {agent.industry && (
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{agent.industry}</p>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
          style={{ color: type.color, backgroundColor: type.bg }}
        >
          {type.label}
        </span>
      </div>

      {/* Status + langue */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.dot }} />
          <span className="text-xs" style={{ color: '#8B949E' }}>{status.label}</span>
        </div>
        <span className="text-xs" style={{ color: '#8B949E' }}>
          {LANG_LABEL[agent.language] ?? agent.language}
        </span>
      </div>

      {/* Objectif */}
      {agent.objective && (
        <p className="text-xs line-clamp-2" style={{ color: '#8B949E' }}>{agent.objective}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t" style={{ borderColor: '#1A2332' }}>
        <button
          onClick={toggleStatus}
          disabled={loading}
          className="flex-1 text-xs py-1.5 rounded-lg transition-all"
          style={{
            color: agent.status === 'active' ? '#FF6B6B' : '#00FF88',
            border: `1px solid ${agent.status === 'active' ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}`,
            backgroundColor: 'transparent',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '...' : agent.status === 'active' ? 'Désactiver' : 'Activer'}
        </button>
        <button
          onClick={editAgent}
          disabled={loading}
          className="flex-1 text-xs py-1.5 rounded-lg transition-all"
          style={{
            color: '#00E5FF',
            border: '1px solid rgba(0,229,255,0.3)',
            backgroundColor: 'transparent',
            opacity: loading ? 0.5 : 1,
          }}
        >
          Modifier
        </button>
        <button
          onClick={deleteAgent}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            color: '#8B949E',
            border: '1px solid #1A2332',
            backgroundColor: 'transparent',
            opacity: loading ? 0.5 : 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
