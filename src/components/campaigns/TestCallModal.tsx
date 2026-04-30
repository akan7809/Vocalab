'use client'

import { useState } from 'react'

type Agent = { id: string; name: string }

type Props = {
  agents: Agent[]
  onClose: () => void
}

const inputCls = 'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all'
const inputBase = { backgroundColor: '#080C10', border: '1px solid #1A2332', color: '#E6EDF3' }
const focusOn  = (e: React.FocusEvent<HTMLElement>) =>
  ((e.target as HTMLElement).style.borderColor = '#00E5FF')
const focusOff = (e: React.FocusEvent<HTMLElement>) =>
  ((e.target as HTMLElement).style.borderColor = '#1A2332')
const labelCls = 'text-xs uppercase tracking-widest mb-1.5 block'

type ModalPhase = 'form' | 'loading' | 'success' | 'error'

export default function TestCallModal({ agents, onClose }: Props) {
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('+33')
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [phase,   setPhase]   = useState<ModalPhase>('form')
  const [errMsg,  setErrMsg]  = useState('')
  const [callId,  setCallId]  = useState('')

  async function handleLaunch() {
    if (!name.trim() || !phone.trim() || !agentId) return
    setPhase('loading')
    setErrMsg('')

    try {
      // 1. Crée un lead temporaire
      const leadRes = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify([{
          contact_name: name.trim(),
          phone:        phone.trim(),
          company_name: `Test — ${name.trim()}`,
          status:       'pending',
          source:       'test',
        }]),
      })
      const leadData = await leadRes.json()
      if (!leadRes.ok) {
        setErrMsg(leadData.error ?? 'Impossible de créer le lead de test.')
        setPhase('error')
        return
      }

      // L'API /api/leads retourne { data, count } — on prend le premier ID
      const leadId: string | undefined = leadData.data?.[0]?.id
      if (!leadId) {
        setErrMsg('Lead créé mais ID introuvable.')
        setPhase('error')
        return
      }

      // 2. Lance l'appel
      const callRes = await fetch('/api/calls/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ leadId, agentId }),
      })
      const callData = await callRes.json()
      if (!callRes.ok) {
        setErrMsg(callData.error ?? 'Impossible de lancer l\'appel.')
        setPhase('error')
        return
      }

      setCallId(callData.callId ?? '')
      setPhase('success')
    } catch (err: any) {
      setErrMsg(err?.message ?? 'Erreur réseau.')
      setPhase('error')
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-md rounded-2xl border flex flex-col gap-6 p-6 relative"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
          style={{ color: '#8B949E', backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          ✕
        </button>

        {/* Title */}
        <div>
          <h2 className="text-base font-bold" style={{ color: '#E6EDF3' }}>
            🧪 Tester un appel
          </h2>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
            Crée un contact temporaire et lance immédiatement un appel IA.
          </p>
        </div>

        {/* ── Form ── */}
        {(phase === 'form' || phase === 'loading') && (
          <div className="flex flex-col gap-4">
            {/* Nom */}
            <div>
              <label className={labelCls} style={{ color: '#8B949E' }}>Nom du contact</label>
              <input
                className={inputCls}
                style={inputBase}
                placeholder="Ex : Jean Dupont"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={focusOn} onBlur={focusOff}
                disabled={phase === 'loading'}
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className={labelCls} style={{ color: '#8B949E' }}>Numéro de téléphone</label>
              <input
                className={inputCls}
                style={inputBase}
                placeholder="+33612345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onFocus={focusOn} onBlur={focusOff}
                disabled={phase === 'loading'}
                type="tel"
              />
              <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
                Format international : +33XXXXXXXXX
              </p>
            </div>

            {/* Agent */}
            <div>
              <label className={labelCls} style={{ color: '#8B949E' }}>Agent vocal</label>
              {agents.length === 0 ? (
                <p className="text-xs py-2" style={{ color: '#FF6B6B' }}>
                  ⚠️ Aucun agent actif — activez un agent dans /agents
                </p>
              ) : (
                <select
                  className={inputCls}
                  style={{ ...inputBase, appearance: 'none' as any }}
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  onFocus={focusOn} onBlur={focusOff}
                  disabled={phase === 'loading'}
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleLaunch}
              disabled={!name.trim() || phone.trim().length < 8 || !agentId || phase === 'loading'}
              className="w-full py-3 rounded-xl font-bold text-sm mt-2 transition-all"
              style={{
                backgroundColor: phase === 'loading' ? '#0A2A35'
                  : (!name.trim() || phone.trim().length < 8 || !agentId) ? '#1A2332'
                  : '#00E5FF',
                color: phase === 'loading' ? '#00E5FF'
                  : (!name.trim() || phone.trim().length < 8 || !agentId) ? '#8B949E'
                  : '#080C10',
                cursor: (phase === 'loading' || !name.trim() || phone.trim().length < 8 || !agentId)
                  ? 'not-allowed' : 'pointer',
              }}
            >
              {phase === 'loading' ? '⏳ Lancement en cours...' : '📞 Lancer le test'}
            </button>
          </div>
        )}

        {/* ── Succès ── */}
        {phase === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}
            >
              ✅
            </div>
            <div>
              <p className="font-bold" style={{ color: '#00FF88' }}>Appel lancé avec succès !</p>
              <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
                Vapi est en train d'appeler <span style={{ color: '#E6EDF3' }}>{phone}</span>
              </p>
              {callId && (
                <p className="text-xs mt-2 font-mono" style={{ color: '#8B949E' }}>
                  ID : {callId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ backgroundColor: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.3)' }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* ── Erreur ── */}
        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)' }}
            >
              ❌
            </div>
            <div>
              <p className="font-bold" style={{ color: '#FF6B6B' }}>Erreur lors du lancement</p>
              <p className="text-xs mt-1" style={{ color: '#8B949E' }}>{errMsg}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('form'); setErrMsg('') }}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: 'rgba(0,229,255,0.08)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}
              >
                Réessayer
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: '#8B949E', border: '1px solid #1A2332' }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
