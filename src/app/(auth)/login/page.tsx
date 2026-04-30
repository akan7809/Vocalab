'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <>
      {registered && (
        <p
          className="text-sm rounded-lg px-4 py-3 mb-6"
          style={{
            color: '#00FF88',
            backgroundColor: 'rgba(0, 255, 136, 0.08)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            fontFamily: 'monospace',
          }}
        >
          Compte créé ! Confirmez votre email puis connectez-vous.
        </p>
      )}
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: 'monospace', color: '#E6EDF3' }}
      >
        Connexion
      </h1>
      <p className="text-sm mb-8" style={{ color: '#8B949E', fontFamily: 'monospace' }}>
        Accédez à votre espace Vocalab
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-xs uppercase tracking-widest"
            style={{ color: '#8B949E', fontFamily: 'monospace' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vous@entreprise.com"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
            style={{
              backgroundColor: '#080C10',
              border: '1px solid #1A2332',
              color: '#E6EDF3',
              fontFamily: 'monospace',
            }}
            onFocus={e => (e.target.style.borderColor = '#00E5FF')}
            onBlur={e => (e.target.style.borderColor = '#1A2332')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-xs uppercase tracking-widest"
            style={{ color: '#8B949E', fontFamily: 'monospace' }}
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
            style={{
              backgroundColor: '#080C10',
              border: '1px solid #1A2332',
              color: '#E6EDF3',
              fontFamily: 'monospace',
            }}
            onFocus={e => (e.target.style.borderColor = '#00E5FF')}
            onBlur={e => (e.target.style.borderColor = '#1A2332')}
          />
        </div>

        {error && (
          <p
            className="text-sm rounded-lg px-4 py-3"
            style={{
              color: '#FF6B6B',
              backgroundColor: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              fontFamily: 'monospace',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-3 font-bold text-sm transition-all mt-2"
          style={{
            backgroundColor: loading ? '#0A2A35' : '#00E5FF',
            color: loading ? '#00E5FF' : '#080C10',
            fontFamily: 'monospace',
            border: loading ? '1px solid #00E5FF' : 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: '#8B949E', fontFamily: 'monospace' }}
      >
        Pas encore de compte ?{' '}
        <Link href="/register" style={{ color: '#00E5FF' }} className="hover:underline">
          S&apos;inscrire
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
