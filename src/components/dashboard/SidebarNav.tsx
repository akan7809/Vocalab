'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',        label: 'Dashboard',  icon: '⊞' },
  { href: '/agents',           label: 'Agents',     icon: '◎' },
  { href: '/leads',            label: 'Leads',      icon: '◈' },
  { href: '/campaigns/calls',  label: 'Appels',     icon: '🎙' },
  { href: '/campaigns/email',  label: 'Emails',     icon: '📧' },
  { href: '/settings',         label: 'Paramètres', icon: '⚙' },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
      {navItems.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{
              color: active ? '#E6EDF3' : '#8B949E',
              backgroundColor: active ? '#111820' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!active) {
                ;(e.currentTarget as HTMLElement).style.color = '#E6EDF3'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = '#111820'
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                ;(e.currentTarget as HTMLElement).style.color = '#8B949E'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }
            }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
