'use client'

import { useState, useEffect, useRef } from 'react'

const APIFY_TOKEN = process.env.NEXT_PUBLIC_APIFY_API_KEY
const ACTOR_ID    = '2zMYaRqzlVxBTkS7E'

const INDUSTRIES = ['BTP', 'Immobilier', 'SaaS', 'Finance', 'Santé', 'E-commerce', 'Industrie', 'Restauration', 'Autre']
const COUNTS = [
  { value: 50,  label: '50 leads' },
  { value: 100, label: '100 leads' },
  { value: 200, label: '200 leads' },
  { value: 500, label: '500 leads' },
]

type Phase = 'idle' | 'starting' | 'running' | 'processing' | 'saving' | 'done' | 'failed'

const STEPS: { label: string; activeOn: Phase[] }[] = [
  { label: 'Connexion à Apify',         activeOn: ['starting'] },
  { label: 'Scraping Google Maps',       activeOn: ['running'] },
  { label: 'Traitement des résultats',   activeOn: ['processing'] },
  { label: 'Sauvegarde en base',         activeOn: ['saving'] },
]
const DONE_PHASES: Phase[] = ['processing', 'saving', 'done']

const inputCls = 'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all'
const inputStyle = { backgroundColor: '#080C10', border: '1px solid #1A2332', color: '#E6EDF3' }
const focusOn  = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = '#00E5FF')
const focusOff = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = '#1A2332')
const labelCls = 'text-xs uppercase tracking-widest mb-1.5 block'

export default function ScrapeForm() {
  const [industry, setIndustry] = useState('')
  const [city,     setCity]     = useState('')
  const [count,    setCount]    = useState(100)
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [runId,    setRunId]    = useState('')
  const [resultCount, setResultCount] = useState(0)
  const [error,    setError]    = useState('')
  const [dots,     setDots]     = useState('')

  // Refs for polling closure
  const runIdRef   = useRef('')
  const countRef   = useRef(count)
  const industryRef = useRef(industry)
  const cityRef     = useRef(city)
  useEffect(() => { runIdRef.current    = runId   }, [runId])
  useEffect(() => { countRef.current    = count   }, [count])
  useEffect(() => { industryRef.current = industry }, [industry])
  useEffect(() => { cityRef.current     = city    }, [city])

  // Dots animation
  useEffect(() => {
    if (phase !== 'running') { setDots(''); return }
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600)
    return () => clearInterval(t)
  }, [phase])

  // Polling Apify run status
  useEffect(() => {
    if (phase !== 'running') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `https://api.apify.com/v2/actor-runs/${runIdRef.current}`,
          { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
        )
        const json = await res.json()
        const runStatus: string      = json?.data?.status ?? ''
        const datasetId: string      = json?.data?.defaultDatasetId ?? ''

        if (runStatus === 'SUCCEEDED') {
          clearInterval(interval)
          await fetchAndSave(datasetId)
        } else if (
          runStatus === 'FAILED' ||
          runStatus === 'ABORTED' ||
          runStatus === 'TIMED-OUT'
        ) {
          clearInterval(interval)
          setError(`Run Apify ${runStatus.toLowerCase()}`)
          setPhase('failed')
        }
        // RUNNING / READY → keep polling
      } catch (err: any) {
        clearInterval(interval)
        setError(err?.message ?? 'Erreur réseau lors du polling.')
        setPhase('failed')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAndSave(datasetId: string) {
    setPhase('processing')
    try {
      // 1. Récupère les items du dataset
      const datasetRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${countRef.current}`,
        { headers: { Authorization: `Bearer ${APIFY_TOKEN}` } }
      )
      const items: any[] = await datasetRes.json()

      if (!Array.isArray(items) || items.length === 0) {
        setResultCount(0)
        setPhase('done')
        setTimeout(() => { window.location.href = '/leads' }, 2500)
        return
      }

      // 2. Transforme en format leads
      const leads = items
        .filter(item => item.title)
        .map(item => ({
          company_name: item.title                                  ?? null,
          phone:        item.phone ?? item.phoneUnformatted         ?? null,
          website:      item.website                                ?? null,
          city:         item.city ?? cityRef.current               ?? null,
          industry:     item.categoryName ?? industryRef.current   ?? null,
          country:      'FR',
          source:       'apify',
          status:       'pending',
        }))

      setPhase('saving')

      // 3. Sauvegarde via notre API (POST /api/leads)
      const saveRes = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(leads),
      })
      const saveData = await saveRes.json()

      if (!saveRes.ok) {
        setError(saveData.error ?? 'Erreur lors de la sauvegarde.')
        setPhase('failed')
        return
      }

      setResultCount(saveData.count ?? leads.length)
      setPhase('done')
      setTimeout(() => { window.location.href = '/leads' }, 2500)
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors du traitement.')
      setPhase('failed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!industry || !city) return
    setPhase('starting')
    setError('')

    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR_ID}/runs`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${APIFY_TOKEN}`,
          },
          body: JSON.stringify({
            query:    `${industry} ${city}`,
            maxItems: count,
            country:  'FR',
          }),
        }
      )
      const json = await res.json()

      if (!res.ok || !json?.data?.id) {
        setError(json?.error?.message ?? 'Impossible de démarrer le run Apify.')
        setPhase('failed')
        return
      }

      setRunId(json.data.id)
      setPhase('running')
    } catch (err: any) {
      setError(err?.message ?? 'Erreur réseau.')
      setPhase('failed')
    }
  }

  const busy = phase !== 'idle' && phase !== 'done' && phase !== 'failed'

  // ── UI ──────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">

      {/* Secteur */}
      <div>
        <label className={labelCls} style={{ color: '#8B949E' }}>Secteur cible</label>
        <select
          className={inputCls}
          style={{ ...inputStyle, appearance: 'none' }}
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
          required disabled={busy}
        >
          <option value="">Sélectionnez un secteur...</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* Ville */}
      <div>
        <label className={labelCls} style={{ color: '#8B949E' }}>Ville ou région</label>
        <input
          className={inputCls} style={inputStyle}
          placeholder="Ex: Paris, Lyon, Île-de-France"
          value={city}
          onChange={e => setCity(e.target.value)}
          onFocus={focusOn} onBlur={focusOff}
          required disabled={busy}
        />
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
          Nom de la ville, département ou région
        </p>
      </div>

      {/* Nombre */}
      <div>
        <label className={labelCls} style={{ color: '#8B949E' }}>Nombre de leads souhaités</label>
        <div className="grid grid-cols-4 gap-3">
          {COUNTS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCount(c.value)}
              disabled={busy}
              className="rounded-xl p-3 text-center transition-all border text-sm font-bold"
              style={{
                backgroundColor: count === c.value ? 'rgba(0,229,255,0.08)' : '#080C10',
                borderColor:     count === c.value ? '#00E5FF' : '#1A2332',
                color:           count === c.value ? '#00E5FF' : '#8B949E',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu requête */}
      {industry && city && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.2)' }}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#00E5FF' }}>Requête Google Maps</p>
          <p className="text-sm font-mono" style={{ color: '#E6EDF3' }}>
            &ldquo;{industry} {city}&rdquo; · {count} résultats max
          </p>
        </div>
      )}

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={!industry || !city || busy}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all"
        style={{
          backgroundColor: busy ? '#0A2A35' : (!industry || !city) ? '#1A2332' : '#00E5FF',
          color:           busy ? '#00E5FF' : (!industry || !city) ? '#8B949E' : '#080C10',
          cursor:          (!industry || !city || busy) ? 'not-allowed' : 'pointer',
        }}
      >
        {phase === 'starting'   ? '⏳ Démarrage...'
          : phase === 'running'   ? `🔍 Scraping en cours${dots}`
          : phase === 'processing'? '⚙️ Traitement...'
          : phase === 'saving'    ? '💾 Sauvegarde...'
          : '🚀 Lancer le scraping'}
      </button>

      {/* Zone de progression */}
      {busy && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
          <p className="text-sm font-bold mb-4" style={{ color: '#E6EDF3' }}>Progression</p>
          <div className="flex flex-col gap-3">
            {STEPS.map((step, i) => {
              const stepPhaseIndex  = ['starting', 'running', 'processing', 'saving'].indexOf(step.activeOn[0])
              const currentIndex    = ['starting', 'running', 'processing', 'saving'].indexOf(phase)
              const isDone          = currentIndex > stepPhaseIndex
              const isActive        = step.activeOn.includes(phase)

              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{
                      backgroundColor: isDone   ? 'rgba(0,255,136,0.15)'
                        : isActive  ? 'rgba(0,229,255,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: isDone   ? '1px solid rgba(0,255,136,0.4)'
                        : isActive  ? '1px solid rgba(0,229,255,0.4)'
                        : '1px solid #1A2332',
                    }}
                  >
                    {isDone  ? <span style={{ color: '#00FF88' }}>✓</span>
                      : isActive ? <span style={{ color: '#00E5FF' }}>⋯</span>
                      : null}
                  </div>
                  <span className="text-xs" style={{
                    color: isDone ? '#00FF88' : isActive ? '#E6EDF3' : '#8B949E'
                  }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: '#8B949E' }}>
            Le scraping peut prendre 1 à 3 minutes.
          </p>
        </div>
      )}

      {/* Succès */}
      {phase === 'done' && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'rgba(0,255,136,0.04)', borderColor: 'rgba(0,255,136,0.3)' }}>
          <p className="text-sm font-bold" style={{ color: '#00FF88' }}>
            ✓ {resultCount} lead{resultCount > 1 ? 's' : ''} importé{resultCount > 1 ? 's' : ''} avec succès
          </p>
          <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Redirection vers la liste...</p>
        </div>
      )}

      {/* Erreur */}
      {phase === 'failed' && error && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgba(255,107,107,0.06)', borderColor: 'rgba(255,107,107,0.3)' }}>
          <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setError('') }}
            className="text-xs mt-2 underline"
            style={{ color: '#8B949E' }}
          >
            Réessayer
          </button>
        </div>
      )}
    </form>
  )
}
