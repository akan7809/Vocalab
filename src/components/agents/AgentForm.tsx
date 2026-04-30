'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type AgentFormData = {
  name: string
  type: 'inbound' | 'outbound'
  language: string
  industry: string
  objective: string
  first_message: string
  system_prompt: string
  voice_id: string
}

const EMPTY: AgentFormData = {
  name: '', type: 'outbound', language: 'fr',
  industry: '', objective: '', first_message: '', system_prompt: '', voice_id: 'sophie',
}

const VOICES = [
  { id: 'sophie', name: 'Sophie', desc: 'Femme · Français · Chaleureuse' },
  { id: 'thomas', name: 'Thomas', desc: 'Homme · Français · Professionnel' },
  { id: 'emma',   name: 'Emma',   desc: 'Femme · Anglais · Dynamique' },
]

const LANGS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'ar', label: 'Arabe' },
]

const INDUSTRIES = ['BTP', 'Immobilier', 'SaaS', 'Finance', 'Santé', 'E-commerce', 'Industrie', 'Autre']

const STEPS = ['Identité', 'Comportement', 'Voix & Déploiement']

/* ── Shared input styles ── */
const inputCls = 'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all'
const inputStyle = { backgroundColor: '#080C10', border: '1px solid #1A2332', color: '#E6EDF3', fontFamily: 'monospace' }
const focusOn  = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = '#00E5FF')
const focusOff = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = '#1A2332')

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: '#8B949E' }}>{children}</p>
}

/* ── Step 1 ── */
function Step1({ data, set }: { data: AgentFormData; set: (k: keyof AgentFormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label>Nom de l&apos;agent</Label>
        <input
          className={inputCls} style={inputStyle}
          placeholder="Ex : Sophie - Prospection BTP"
          value={data.name}
          onChange={e => set('name', e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
        />
      </div>

      <div>
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['outbound', 'inbound'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className="rounded-xl p-4 text-left transition-all border"
              style={{
                backgroundColor: data.type === t ? 'rgba(0,229,255,0.06)' : '#080C10',
                borderColor: data.type === t ? '#00E5FF' : '#1A2332',
                color: data.type === t ? '#00E5FF' : '#8B949E',
              }}
            >
              <p className="font-bold text-sm">{t === 'outbound' ? '📞 Sortant' : '📲 Entrant'}</p>
              <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
                {t === 'outbound' ? 'Appels vers vos prospects' : 'Répond aux appels entrants'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Langue</Label>
          <select
            className={inputCls} style={{ ...inputStyle, appearance: 'none' as any }}
            value={data.language} onChange={e => set('language', e.target.value)}
            onFocus={focusOn} onBlur={focusOff}
          >
            {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Secteur cible</Label>
          <select
            className={inputCls} style={{ ...inputStyle, appearance: 'none' as any }}
            value={data.industry} onChange={e => set('industry', e.target.value)}
            onFocus={focusOn} onBlur={focusOff}
          >
            <option value="">Sélectionnez...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

/* ── Step 2 ── */
function Step2({ data, set }: { data: AgentFormData; set: (k: keyof AgentFormData, v: string) => void }) {
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [genError, setGenError] = useState('')

  const canGenerate = data.name.trim().length > 0 && data.type && data.industry.trim().length > 0 && data.objective.trim().length > 0

  async function handleGenerate() {
    setGenerating(true)
    setGenerated(false)
    setGenError('')
    try {
      const res = await fetch('/api/generate-agent-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          language: data.language,
          industry: data.industry,
          objective: data.objective,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGenError(json.error ?? 'Erreur lors de la génération.')
        return
      }
      if (json.system_prompt) set('system_prompt', json.system_prompt)
      if (json.first_message) set('first_message', json.first_message)
      setGenerated(true)
    } catch {
      setGenError('Erreur réseau.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* AI Generate button — visible only when step 1 fields are filled */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.2)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
              ✨ Générer avec l&apos;IA
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
              {canGenerate
                ? 'Claude va rédiger votre script et premier message automatiquement'
                : 'Remplissez nom, secteur et objectif pour débloquer la génération IA'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="shrink-0 text-sm px-4 py-2 rounded-lg font-bold transition-all"
            style={{
              backgroundColor: !canGenerate ? '#1A2332' : generating ? '#0A2A35' : '#00E5FF',
              color: !canGenerate ? '#8B949E' : generating ? '#00E5FF' : '#080C10',
              minWidth: '140px',
              cursor: !canGenerate ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? '⏳ Génération...' : generated ? '↺ Régénérer' : '✨ Générer'}
          </button>
        </div>
        {generated && !generating && (
          <p className="text-xs mt-2 font-bold" style={{ color: '#00FF88' }}>
            ✓ Script généré — vous pouvez le modifier ci-dessous
          </p>
        )}
        {genError && (
          <p className="text-xs mt-2" style={{ color: '#FF6B6B' }}>{genError}</p>
        )}
      </div>

      <div>
        <Label>Objectif principal</Label>
        <input
          className={inputCls} style={inputStyle}
          placeholder="Ex : Qualifier les leads et obtenir un RDV"
          value={data.objective}
          onChange={e => set('objective', e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
        />
      </div>

      <div>
        <Label>Message d&apos;accueil (first message)</Label>
        <textarea
          rows={3}
          className={inputCls} style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Ex : Bonjour, je suis Sophie de Vocalab. Est-ce que je vous dérange ?"
          value={data.first_message}
          onChange={e => set('first_message', e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
        />
      </div>

      <div>
        <Label>Instructions système (system prompt)</Label>
        <textarea
          rows={8}
          className={inputCls} style={{ ...inputStyle, resize: 'vertical' }}
          placeholder={`Ex: Tu es Sophie, une assistante commerciale de [Entreprise]. Tu appelles des professionnels du BTP pour leur présenter notre solution...

Règles :
- Sois chaleureuse et professionnelle
- Pose des questions ouvertes
- Si l'interlocuteur est intéressé, propose un RDV`}
          value={data.system_prompt}
          onChange={e => set('system_prompt', e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
        />
      </div>
    </div>
  )
}

/* ── Step 3 ── */
function Step3({ data, set }: { data: AgentFormData; set: (k: keyof AgentFormData, v: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Label>Voix de l&apos;agent</Label>
        <div className="flex flex-col gap-3">
          {VOICES.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => set('voice_id', v.id)}
              className="flex items-center gap-4 rounded-xl p-4 text-left transition-all border"
              style={{
                backgroundColor: data.voice_id === v.id ? 'rgba(0,229,255,0.06)' : '#080C10',
                borderColor: data.voice_id === v.id ? '#00E5FF' : '#1A2332',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)' }}
              >
                {v.id === 'thomas' ? '👨' : '👩'}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: data.voice_id === v.id ? '#00E5FF' : '#E6EDF3' }}>
                  {v.name}
                </p>
                <p className="text-xs" style={{ color: '#8B949E' }}>{v.desc}</p>
              </div>
              {data.voice_id === v.id && (
                <span className="ml-auto text-xs font-bold" style={{ color: '#00E5FF' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu */}
      {data.first_message && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.2)' }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#00E5FF' }}>
            Aperçu — Premier message
          </p>
          <p className="text-sm" style={{ color: '#E6EDF3', fontStyle: 'italic' }}>
            &ldquo;{data.first_message}&rdquo;
          </p>
          <p className="text-xs mt-2" style={{ color: '#8B949E' }}>
            — {data.name || 'Votre agent'} · {VOICES.find(v => v.id === data.voice_id)?.name}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Main Form ── */
export default function AgentForm({
  initial,
  agentId,
  submitLabel = 'Créer l\'agent',
}: {
  initial?: Partial<AgentFormData>
  agentId?: string
  submitLabel?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<AgentFormData>({ ...EMPTY, ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof AgentFormData, v: string) {
    setData(d => ({ ...d, [k]: v }))
  }

  function canNext() {
    if (step === 0) return data.name.trim().length > 0
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const url    = agentId ? `/api/agents/${agentId}` : '/api/agents'
    const method = agentId ? 'PATCH' : 'POST'

    console.log('=== SUBMIT AGENT ===')
    console.log('FormData complète:', JSON.stringify(data, null, 2))

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    console.log('Status:', res.status)
    const responseData = await res.clone().json().catch(() => ({}))
    console.log('Response body:', responseData)

    if (!res.ok) {
      setError(responseData.error ?? 'Erreur lors de la sauvegarde.')
      setLoading(false)
      return
    }

    window.location.href = '/agents'
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: i <= step ? '#00E5FF' : '#1A2332',
                  color: i <= step ? '#080C10' : '#8B949E',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i === step ? '#E6EDF3' : '#8B949E' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ backgroundColor: i < step ? '#00E5FF' : '#1A2332' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <h2 className="text-lg font-bold mb-6" style={{ color: '#E6EDF3' }}>
        Étape {step + 1} — {STEPS[step]}
      </h2>

      {/* Step content */}
      <div
        className="rounded-xl border p-6 mb-6"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
      >
        {step === 0 && <Step1 data={data} set={set} />}
        {step === 1 && <Step2 data={data} set={set} />}
        {step === 2 && <Step3 data={data} set={set} />}
      </div>

      {error && (
        <p className="text-sm rounded-lg px-4 py-3 mb-4"
          style={{ color: '#FF6B6B', backgroundColor: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="text-sm px-5 py-2.5 rounded-lg transition-all"
          style={{ color: step === 0 ? '#1A2332' : '#8B949E', border: `1px solid ${step === 0 ? '#1A2332' : '#8B949E'}` }}
        >
          ← Précédent
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            className="text-sm px-5 py-2.5 rounded-lg font-bold transition-all"
            style={{
              backgroundColor: canNext() ? '#00E5FF' : '#1A2332',
              color: canNext() ? '#080C10' : '#8B949E',
            }}
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-6 py-2.5 rounded-lg font-bold transition-all"
            style={{ backgroundColor: loading ? '#0A2A35' : '#00E5FF', color: loading ? '#00E5FF' : '#080C10' }}
          >
            {loading ? 'Sauvegarde...' : submitLabel}
          </button>
        )}
      </div>
    </div>
  )
}
