'use client'

import { useState } from 'react'

type Lead = {
  id: string
  company_name: string | null
  contact_name: string | null
  email:        string | null
  city:         string | null
  industry:     string | null
}

type GeneratedEmail = {
  subject:       string
  body:          string
  editedSubject: string
  editedBody:    string
}

type SendResult = {
  leadId:  string
  success: boolean
  error?:  string
}

type Phase = 'select' | 'generating' | 'review' | 'sending' | 'done'

const inputStyle = {
  backgroundColor: '#080C10',
  border:          '1px solid #1A2332',
  color:           '#E6EDF3',
  borderRadius:    '0.5rem',
  outline:         'none',
  fontSize:        '0.75rem',
  padding:         '0.5rem 0.75rem',
  width:           '100%',
}

export default function EmailCampaignClient({ leads }: { leads: Lead[] }) {
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [emails,       setEmails]       = useState<Record<string, GeneratedEmail>>({})
  const [genProgress,  setGenProgress]  = useState(0)
  const [sentCount,    setSentCount]    = useState(0)
  const [sendResults,  setSendResults]  = useState<SendResult[]>([])
  const [phase,        setPhase]        = useState<Phase>('select')
  const [genError,     setGenError]     = useState('')

  // Tous les leads passés en props ont déjà un email valide (filtré côté serveur)
  const selectedList      = Array.from(selected)
  const selectedWithEmail = selectedList // tous ont un email
  const totalToSend       = selectedWithEmail.length

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map(l => l.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateSubject(leadId: string, value: string) {
    setEmails(prev => ({ ...prev, [leadId]: { ...prev[leadId], editedSubject: value } }))
  }

  function updateBody(leadId: string, value: string) {
    setEmails(prev => ({ ...prev, [leadId]: { ...prev[leadId], editedBody: value } }))
  }

  async function handleGenerate() {
    setPhase('generating')
    setGenProgress(0)
    setGenError('')
    const newEmails: Record<string, GeneratedEmail> = {}

    for (let i = 0; i < selectedWithEmail.length; i++) {
      const leadId = selectedWithEmail[i]
      const lead   = leads.find(l => l.id === leadId)!
      try {
        const res  = await fetch('/api/email/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            city:         lead.city,
            industry:     lead.industry,
          }),
        })
        const data = await res.json()
        newEmails[leadId] = {
          subject:       data.subject ?? '',
          body:          data.body    ?? '',
          editedSubject: data.subject ?? '',
          editedBody:    data.body    ?? '',
        }
      } catch {
        newEmails[leadId] = { subject: '', body: '', editedSubject: '', editedBody: '' }
      }
      setGenProgress(i + 1)
      setEmails({ ...newEmails })
    }

    setPhase('review')
  }

  async function handleSendAll() {
    setPhase('sending')
    setSentCount(0)
    setSendResults([])

    for (let i = 0; i < selectedWithEmail.length; i++) {
      const leadId = selectedWithEmail[i]
      const email  = emails[leadId]
      if (!email?.editedSubject || !email?.editedBody) {
        setSendResults(prev => [...prev, { leadId, success: false, error: 'Email non généré' }])
        setSentCount(i + 1)
        continue
      }

      try {
        const res  = await fetch('/api/email/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            leadId,
            subject: email.editedSubject,
            body:    email.editedBody,
          }),
        })
        const data = await res.json()
        setSendResults(prev => [...prev, { leadId, success: res.ok, error: data.error }])
      } catch (err: any) {
        setSendResults(prev => [...prev, { leadId, success: false, error: err.message }])
      }
      setSentCount(i + 1)
    }

    setPhase('done')
  }

  const successCount = sendResults.filter(r => r.success).length
  const failCount    = sendResults.filter(r => !r.success).length

  // ── Render ─────────────────────────────────────────────────

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        <span className="text-3xl">📭</span>
        <div className="text-center">
          <p className="font-bold" style={{ color: '#E6EDF3' }}>Aucun lead en attente</p>
          <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
            Importez des leads avec une adresse email pour lancer une campagne
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Étape 1 : Sélection ── */}
      {(phase === 'select' || phase === 'generating') && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
          {/* Header table */}
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1A2332' }}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size === leads.length && leads.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: '#00E5FF' }}
              />
              <span className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
                {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : 'Sélectionner tout'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={selected.size === 0 || phase === 'generating'}
                className="text-sm px-4 py-2 rounded-lg font-bold transition-all"
                style={{
                  backgroundColor: selected.size === 0 ? '#1A2332' : '#00E5FF',
                  color:           selected.size === 0 ? '#8B949E' : '#080C10',
                  cursor:          selected.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {phase === 'generating'
                  ? `⏳ Génération ${genProgress}/${selectedWithEmail.length}...`
                  : `✨ Générer ${selected.size > 0 ? `(${selected.size})` : ''} emails avec IA`}
              </button>
            </div>
          </div>

          {/* Progress bar génération */}
          {phase === 'generating' && (
            <div className="px-5 py-2 border-b" style={{ borderColor: '#1A2332' }}>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1A2332' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(genProgress / selectedWithEmail.length) * 100}%`, backgroundColor: '#00E5FF' }}
                />
              </div>
            </div>
          )}

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: '#1A2332' }}>
            {leads.map(lead => {
              const isChecked = selected.has(lead.id)
              return (
                <div key={lead.id} className="px-5 py-3 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(lead.id)}
                    className="w-4 h-4 shrink-0 cursor-pointer"
                    style={{ accentColor: '#00E5FF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#E6EDF3' }}>
                      {lead.company_name ?? '—'}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#8B949E' }}>
                      {lead.email} {lead.city ? `· ${lead.city}` : ''}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: '#8B949E' }}>
                    {lead.industry ?? '—'}
                  </span>
                  {/* Generated badge */}
                  {emails[lead.id] && (
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ color: '#00FF88', backgroundColor: 'rgba(0,255,136,0.1)' }}>
                      ✓ généré
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Étape 2 : Aperçu et édition ── */}
      {(phase === 'review' || phase === 'sending' || phase === 'done') && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
              Aperçu des emails — {selectedWithEmail.length} à envoyer
            </h2>
            {phase === 'review' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setPhase('select')}
                  className="text-sm px-4 py-2 rounded-lg transition-all"
                  style={{ color: '#8B949E', border: '1px solid #1A2332' }}
                >
                  ← Modifier la sélection
                </button>
                <button
                  onClick={handleSendAll}
                  className="text-sm px-4 py-2 rounded-lg font-bold transition-all"
                  style={{ backgroundColor: '#00E5FF', color: '#080C10' }}
                >
                  📨 Envoyer tout ({selectedWithEmail.length})
                </button>
              </div>
            )}
          </div>

          {/* Progress envoi */}
          {phase === 'sending' && (
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
                  Envoi en cours... {sentCount}/{totalToSend}
                </span>
                <span className="text-xs" style={{ color: '#8B949E' }}>
                  {Math.round((sentCount / totalToSend) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1A2332' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(sentCount / totalToSend) * 100}%`, backgroundColor: '#00E5FF' }}
                />
              </div>
            </div>
          )}

          {/* Résumé done */}
          {phase === 'done' && (
            <div className="rounded-xl border p-5 flex gap-6"
              style={{ backgroundColor: 'rgba(0,255,136,0.04)', borderColor: 'rgba(0,255,136,0.3)' }}>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#00FF88' }}>{successCount}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>emails envoyés</p>
              </div>
              {failCount > 0 && (
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#FF6B6B' }}>{failCount}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>échecs</p>
                </div>
              )}
            </div>
          )}

          {/* Email cards */}
          <div className="flex flex-col gap-4">
            {selectedWithEmail.map(leadId => {
              const lead    = leads.find(l => l.id === leadId)!
              const email   = emails[leadId]
              const result  = sendResults.find(r => r.leadId === leadId)
              if (!email) return null

              return (
                <div
                  key={leadId}
                  className="rounded-xl border p-5"
                  style={{
                    backgroundColor: '#0D1117',
                    borderColor: result
                      ? result.success ? 'rgba(0,255,136,0.3)' : 'rgba(255,107,107,0.3)'
                      : '#1A2332',
                  }}
                >
                  {/* Lead info */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#E6EDF3' }}>{lead.company_name}</p>
                      <p className="text-xs" style={{ color: '#8B949E' }}>{lead.email}</p>
                    </div>
                    {result && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          color: result.success ? '#00FF88' : '#FF6B6B',
                          backgroundColor: result.success ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,107,0.1)',
                        }}>
                        {result.success ? '✓ Envoyé' : `✗ ${result.error ?? 'Échec'}`}
                      </span>
                    )}
                  </div>

                  {/* Editable subject */}
                  <div className="mb-3">
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8B949E' }}>Objet</p>
                    <input
                      type="text"
                      value={email.editedSubject}
                      onChange={e => updateSubject(leadId, e.target.value)}
                      disabled={phase !== 'review'}
                      style={inputStyle}
                    />
                  </div>

                  {/* Editable body */}
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8B949E' }}>Corps</p>
                    <textarea
                      rows={5}
                      value={email.editedBody}
                      onChange={e => updateBody(leadId, e.target.value)}
                      disabled={phase !== 'review'}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'sans-serif' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
