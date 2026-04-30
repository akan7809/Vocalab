'use client'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending',        label: 'En attente' },
  { value: 'calling',        label: 'En cours d\'appel' },
  { value: 'called',         label: 'Appelé' },
  { value: 'interested',     label: 'Intéressé' },
  { value: 'not_interested', label: 'Non intéressé' },
  { value: 'callback',       label: 'Rappel' },
  { value: 'converted',      label: 'Converti' },
]

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Tous les secteurs' },
  ...['BTP', 'Immobilier', 'SaaS', 'Finance', 'Santé', 'E-commerce', 'Industrie', 'Autre'].map(i => ({ value: i, label: i })),
]

const selectStyle = {
  backgroundColor: '#0D1117',
  border: '1px solid #1A2332',
  color: '#E6EDF3',
  borderRadius: '0.5rem',
  padding: '0.4rem 0.75rem',
  fontSize: '0.75rem',
  outline: 'none',
  appearance: 'none' as const,
}

export default function LeadsFilters({
  status, industry, city, total,
}: {
  status: string; industry: string; city: string; total: number
}) {
  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    window.location.href = `/leads?${params.toString()}`
  }

  function handleCity(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') update('city', (e.target as HTMLInputElement).value)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs" style={{ color: '#8B949E' }}>
        {total.toLocaleString('fr-FR')} lead{total > 1 ? 's' : ''}
      </span>
      <div className="flex flex-wrap gap-2 ml-auto">
        <select style={selectStyle} value={status} onChange={e => update('status', e.target.value)}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select style={selectStyle} value={industry} onChange={e => update('industry', e.target.value)}>
          {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Ville... (Entrée)"
          defaultValue={city}
          onKeyDown={handleCity}
          style={{ ...selectStyle, minWidth: '140px' }}
        />
        {(status || industry || city) && (
          <button
            onClick={() => { window.location.href = '/leads' }}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' }}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
