import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/dashboard/LogoutButton'
import SidebarNav from '@/components/dashboard/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, full_name, organizations(name, plan)')
    .eq('id', user.id)
    .single()

  const orgName = (profile?.organizations as any)?.name ?? 'Mon organisation'
  const plan    = (profile?.organizations as any)?.plan ?? 'starter'

  const planLabel: Record<string, string> = {
    starter: 'Starter',
    growth:  'Growth',
    scale:   'Scale',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#080C10', fontFamily: 'monospace' }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col w-56 shrink-0 border-r" style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}>
        {/* Logo */}
        <div className="px-6 py-5 border-b" style={{ borderColor: '#1A2332' }}>
          <span className="font-bold text-lg tracking-tight" style={{ color: '#00E5FF' }}>
            Vocal<span style={{ color: '#E6EDF3' }}>ab</span>
          </span>
        </div>

        {/* Nav — Client Component (hover handlers) */}
        <SidebarNav />

        {/* Plan badge */}
        <div className="px-4 py-4 border-t" style={{ borderColor: '#1A2332' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8B949E' }}>Plan</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              {planLabel[plan] ?? plan}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: '#0D1117', borderColor: '#1A2332' }}
        >
          <div>
            <p className="text-xs" style={{ color: '#8B949E' }}>Organisation</p>
            <p className="font-bold text-sm" style={{ color: '#E6EDF3' }}>{orgName}</p>
          </div>
          <LogoutButton />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
