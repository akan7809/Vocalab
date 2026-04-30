import Link from 'next/link'
import ScrapeForm from '@/components/leads/ScrapeForm'

export const dynamic = 'force-dynamic'

export default function ScrapePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-xs transition-all" style={{ color: '#8B949E' }}>
          ← Leads
        </Link>
        <span style={{ color: '#1A2332' }}>/</span>
        <span className="text-xs" style={{ color: '#E6EDF3' }}>Scraper avec Apify</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#E6EDF3' }}>
          ✨ Scraper avec Apify
        </h1>
        <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
          Importez automatiquement des prospects depuis Google Maps
        </p>
      </div>

      {/* Info banner */}
      <div
        className="rounded-xl border p-4 flex gap-4"
        style={{ backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.2)' }}
      >
        <span className="text-lg shrink-0">🗺️</span>
        <div>
          <p className="text-sm font-bold" style={{ color: '#E6EDF3' }}>
            Google Maps Scraper — Apify
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
            Extrait les entreprises locales depuis Google Maps : nom, téléphone, site web, adresse.
            Idéal pour la prospection B2B locale.
          </p>
        </div>
      </div>

      {/* Form card */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
      >
        <ScrapeForm />
      </div>
    </div>
  )
}
