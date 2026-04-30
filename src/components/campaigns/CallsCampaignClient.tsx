'use client'

import { useState, useEffect, useRef } from 'react'

type Lead = {
  id:           string
  company_name: string | null
  contact_name: string | null
  phone:        string | null
  city:         string | null
  industry:     string | null
}

type Agent = {
  id:     string
  name:   string
  type:   string
  status: string
}

type CallState = {
  callId:   string
  status:   string   // queued | ringing | in_progress | completed | failed | no_answer
  outcome:  string | null
}

type Phase = 'select' | 'launching' | 'live' | 'done'

const OUTCOME_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  interested:     { label: 'Intéressé',      icon: '✅', color: '#00FF88' },
  not_interested: { label: 'Non intéressé',  icon: '❌', color: '#FF6B6B' },
  callback:       { label: 'Rappel',         icon: '📅', color: '#00E5FF' },
  converted:      { label: 'Converti',       icon: '🏆', color: '#00FF88' },
  no_answer:      { label: 'Sans réponse',   icon: '📵', color: '#8B949E' },
}

const STATUS_LABEL: Record<string, string> = {
  queued:      '⏳ En file',
  ringing:     '📳 Sonnerie...',
  in_progress: '🎙️ En cours',
  completed:   '✓ Terminé',
  failed:      '✗ Échec',
  no_answer:   '📵 Sans réponse',
}

const FINAL_STATUSES = ['completed', 'failed', 'no_answer']

const selectStyle = {
  backgroundColor: '#0D1117',
  border:          '1px solid #1A2332',
  color:           '#E6EDF3',
  borderRadius:    '0.5rem',
  padding:         '0.5rem 0.75rem',
  fontSize:        '0.75rem',
  outline:         'none',
  appearance:      'none' as const,
}

export default function CallsCampaignClient({
  leads,
  agents,
}: {
  leads:  Lead[]
  agents: Agent[]
}) {
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [agentId,    setAgentId]    = useState(agents[0]?.id ?? '')
  const [phase,      setPhase]      = useState<Phase>('select')
  const [launchIdx,  setLaunchIdx]  = useState(0)
  const [callStates, setCallStates] = useState<Record<string, CallState>>({})
  const [globalError, setGlobalError] = useState('')

  const callStatesRef = useRef(callStates)
  useEffect(() => { callStatesRef.current = callStates }, [callStates])

  const selectedList = Array.from(selected)
  const leadsWithPhone = leads.filter(l => l.phone)

  function toggleAll() {
    selected.size === leadsWithPhone.length
      ? setSelected(new Set())
      : setSelected(new Set(leadsWithPhone.map(l => l.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Lance les appels séquentiellement
  async function handleLaunch() {
    if (!agentId || selected.size === 0) return
    setPhase('launching')
    setGlobalError('')
    setCallStates({})

    const ids = selectedList
    for (let i = 0; i < ids.length; i++) {
      setLaunchIdx(i)
      const leadId = ids[i]
      try {
        const res  = await fetch('/api/calls/start', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ leadId, agentId }),
        })
        const data = await res.json()
        setCallStates(prev => ({
          ...prev,
          [leadId]: {
            callId:  data.callId ?? '',
            status:  res.ok ? 'queued' : 'failed',
            outcome: null,
          },
        }))
      } catch {
        setCallStates(prev => ({
          ...prev,
          [leadId]: { callId: '', status: 'failed', outcome: null },
        }))
      }
      // Petite pause entre chaque appel pour ne pas saturer Vapi
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 1500))
    }

    setPhase('live')
  }

  // Polling des statuts d'appels actifs
  useEffect(() => {
    if (phase !== 'live') return

    const interval = setInterval(async () => {
      const current = callStatesRef.current
      const active  = Object.entries(current).filter(
        ([, s]) => s.callId && !FINAL_STATUSES.includes(s.status)
      )

      if (active.length === 0) {
        setPhase('done')
        clearInterval(interval)
        return
      }

      for (const [leadId, state] of active) {
        try {
          const res  = await fetch(`/api/calls/status?callId=${state.callId}`)
          const data = await res.json()
          if (res.ok) {
            setCallStates(prev => ({
              ...prev,
              [leadId]: { ...prev[leadId], status: data.status, outcome: data.outcome },
            }))
          }
        } catch {
          // ignore — retry next tick
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [phase])

  const totalSelected = selectedList.length
  const completedCount = Object.values(callStates).filter(s => FINAL_STATUSES.includes(s.status)).length
  const interestedCount = Object.values(callStates).filter(s => s.outcome === 'interested' || s.outcome === 'converted').length

  // ── Empty state ──
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        <span className="text-3xl">📵</span>
        <div className="text-center">
          <p className="font-bold" style={{ color: '#E6EDF3' }}>Aucun lead avec téléphone</p>
          <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
            Importez des leads avec un numéro de téléphone pour lancer des appels
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Sélection agent + leads ── */}
      {(phase === 'select' || phase === 'launching') && (
        <>
          {/* Agent selector */}
          <div className="rounded-xl border p-4 flex items-center gap-4"
            style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8B949E' }}>
                Agent vocal
              </p>
              <select
                style={{ ...selectStyle, width: '100%' }}
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                disabled={phase === 'launching'}
              >
                {agents.length === 0
                  ? <option value="">Aucun agent actif</option>
                  : agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.type === 'outbound' ? 'Sortant' : 'Entrant'}
                    </option>
                  ))
                }
              </select>
            </div>
            <div className="shrink-0">
              <button
                onClick={handleLaunch}
                disabled={selected.size === 0 || !agentId || phase === 'launching'}
                className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
                style={{
                  backgroundColor: (selected.size === 0 || !agentId) ? '#1A2332' : '#00E5FF',
                  color:           (selected.size === 0 || !agentId) ? '#8B949E' : '#080C10',
                  cursor:          (selected.size === 0 || !agentId || phase === 'launching') ? 'not-allowed' : 'pointer',
                  minWidth:        '180px',
                }}
              >
                {phase === 'launching'
                  ? `⏳ Lancement ${launchIdx + 1}/${totalSelected}...`
                  : `🎙️ Lancer ${selected.size > 0 ? `(${selected.size})` : ''} appels`}
              </button>
            </div>
          </div>

          {/* Table leads */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
            {/* Header */}
            <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: '#1A2332' }}>
              <input
                type="checkbox"
                checked={selected.size === leadsWithPhone.length && leadsWithPhone.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: '#00E5FF' }}
              />
              <span className="text-xs font-bold" style={{ color: '#E6EDF3' }}>
                {selected.size > 0
                  ? `${selected.size} lead${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}`
                  : 'Sélectionner tout'}
              </span>
              {leadsWithPhone.length < leads.length && (
                <span className="ml-auto text-xs" style={{ color: '#8B949E' }}>
                  ⚠️ {leads.length - leadsWithPhone.length} sans téléphone (masqués)
                </span>
              )}
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: '#1A2332' }}>
              {leadsWithPhone.map(lead => (
                <div key={lead.id} className="px-5 py-3 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                    disabled={phase === 'launching'}
                    className="w-4 h-4 shrink-0 cursor-pointer"
                    style={{ accentColor: '#00E5FF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#E6EDF3' }}>
                      {lead.company_name ?? '—'}
                    </p>
                    <p className="text-xs" style={{ color: '#8B949E' }}>
                      {lead.phone} {lead.city ? `· ${lead.city}` : ''}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: '#8B949E' }}>
                    {lead.industry ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Live & Done ── */}
      {(phase === 'live' || phase === 'done') && (
        <div className="flex flex-col gap-4">
          {/* Header résultats */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
                {phase === 'live' ? '🎙️ Appels en cours' : '✓ Campagne terminée'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                {completedCount}/{totalSelected} terminés
                {interestedCount > 0 && ` · ${interestedCount} intéressé${interestedCount > 1 ? 's' : ''}`}
              </p>
            </div>
            {phase === 'live' && (
              <span
                className="text-xs px-2 py-0.5 rounded-full animate-pulse"
                style={{ color: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' }}
              >
                ⟳ Mise à jour auto
              </span>
            )}
          </div>

          {/* Barre de progression */}
          {totalSelected > 0 && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: '#8B949E' }}>Progression</span>
                <span className="text-xs font-mono" style={{ color: '#E6EDF3' }}>
                  {Math.round((completedCount / totalSelected) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1A2332' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(completedCount / totalSelected) * 100}%`, backgroundColor: '#00E5FF' }}
                />
              </div>
            </div>
          )}

          {/* Cards appels */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
            <div className="divide-y" style={{ borderColor: '#1A2332' }}>
              {selectedList.map(leadId => {
                const lead  = leads.find(l => l.id === leadId)!
                const state = callStates[leadId]
                const outcomeConf = state?.outcome ? OUTCOME_CONFIG[state.outcome] : null

                return (
                  <div key={leadId} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#E6EDF3' }}>
                        {lead.company_name ?? '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                        {lead.phone} {lead.city ? `· ${lead.city}` : ''}
                      </p>
                    </div>

                    {/* Statut appel */}
                    <div className="text-right shrink-0">
                      {!state ? (
                        <span className="text-xs" style={{ color: '#8B949E' }}>⏳ En attente</span>
                      ) : outcomeConf ? (
                        <span className="text-sm font-bold" style={{ color: outcomeConf.color }}>
                          {outcomeConf.icon} {outcomeConf.label}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#8B949E' }}>
                          {STATUS_LABEL[state.status] ?? state.status}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Résumé final */}
          {phase === 'done' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Intéressés',    value: Object.values(callStates).filter(s => s.outcome === 'interested' || s.outcome === 'converted').length,    color: '#00FF88' },
                { label: 'Non intéressés', value: Object.values(callStates).filter(s => s.outcome === 'not_interested').length, color: '#FF6B6B' },
                { label: 'Rappels',       value: Object.values(callStates).filter(s => s.outcome === 'callback').length,       color: '#00E5FF' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
                  <p className="text-2xl font-bold" style={{ color: item.color, fontFamily: 'monospace' }}>
                    {item.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#8B949E' }}>{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {globalError && (
        <p className="text-sm px-4 py-3 rounded-lg" style={{ color: '#FF6B6B', backgroundColor: 'rgba(255,107,107,0.08)' }}>
          {globalError}
        </p>
      )}
    </div>
  )
}
