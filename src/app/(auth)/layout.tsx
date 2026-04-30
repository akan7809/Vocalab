import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vocalab — Authentification',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#080C10' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <span
          className="font-bold tracking-tight"
          style={{ fontFamily: 'monospace', fontSize: '1.75rem', color: '#00E5FF' }}
        >
          Vocal<span style={{ color: '#E6EDF3' }}>ab</span>
        </span>
        <p className="mt-1 text-xs" style={{ color: '#8B949E', fontFamily: 'monospace' }}>
          Votre équipe vocale IA. Opérationnelle en 10 minutes.
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-xl p-8"
        style={{
          backgroundColor: '#0D1117',
          border: '1px solid #1A2332',
        }}
      >
        {children}
      </div>

      <p className="mt-6 text-xs" style={{ color: '#8B949E', fontFamily: 'monospace' }}>
        Powered by <span style={{ color: '#00E5FF' }}>Claude AI</span>
      </p>
    </div>
  )
}
