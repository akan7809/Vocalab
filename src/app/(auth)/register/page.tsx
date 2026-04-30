'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    email: '',
    password: '',
    company: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    // 1. Créer le user dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.firstName } },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Erreur lors de la création du compte.')
      setLoading(false)
      return
    }

    const userId = authData.user.id
    const slug = slugify(form.company) + '-' + userId.slice(0, 6)

    // 2 & 3. Créer l'organization + user via API route (service role, bypass RLS)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        email: form.email,
        firstName: form.firstName,
        company: form.company,
        slug,
      }),
    })

    if (!res.ok) {
      const { error: apiError } = await res.json()
      setError(apiError ?? 'Erreur lors de la configuration du compte.')
      setLoading(false)
      return
    }

    // 4. Si signUp n'a pas établi de session (email confirmation activé),
    //    on force un signIn pour garantir que la session est active
    if (!authData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (signInError) {
        // Compte créé mais connexion impossible — redirection login avec message
        window.location.href = '/login?registered=1'
        return
      }
    }

    window.location.href = '/dashboard'
  }

  const inputStyle = {
    backgroundColor: '#080C10',
    border: '1px solid #1A2332',
    color: '#E6EDF3',
    fontFamily: 'monospace',
  }

  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: 'monospace', color: '#E6EDF3' }}
      >
        Créer un compte
      </h1>
      <p className="text-sm mb-8" style={{ color: '#8B949E', fontFamily: 'monospace' }}>
        Déployez votre premier agent vocal en 10 minutes
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          { id: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Jean' },
          { id: 'company', label: 'Nom de l\'entreprise', type: 'text', placeholder: 'Acme SAS' },
          { id: 'email', label: 'Email professionnel', type: 'email', placeholder: 'vous@entreprise.com' },
          { id: 'password', label: 'Mot de passe', type: 'password', placeholder: '8 caractères minimum' },
        ].map(field => (
          <div key={field.id} className="flex flex-col gap-1">
            <label
              htmlFor={field.id}
              className="text-xs uppercase tracking-widest"
              style={{ color: '#8B949E', fontFamily: 'monospace' }}
            >
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              required
              minLength={field.id === 'password' ? 8 : undefined}
              value={form[field.id as keyof typeof form]}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#00E5FF')}
              onBlur={e => (e.target.style.borderColor = '#1A2332')}
            />
          </div>
        ))}

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
          {loading ? 'Création...' : 'Créer mon compte →'}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: '#8B949E', fontFamily: 'monospace' }}
      >
        Déjà un compte ?{' '}
        <Link href="/login" style={{ color: '#00E5FF' }} className="hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  )
}
