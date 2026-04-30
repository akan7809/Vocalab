'use client'

import { createClient } from '@/lib/supabase/client'
export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs px-3 py-1.5 rounded-lg transition-all"
      style={{ color: '#8B949E', border: '1px solid #1A2332' }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.color = '#E6EDF3'
        ;(e.currentTarget as HTMLElement).style.borderColor = '#8B949E'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.color = '#8B949E'
        ;(e.currentTarget as HTMLElement).style.borderColor = '#1A2332'
      }}
    >
      Déconnexion
    </button>
  )
}
