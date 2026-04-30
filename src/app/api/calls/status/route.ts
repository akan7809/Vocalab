import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  return data?.organization_id ?? null
}

function mapStatus(vapiStatus: string): string {
  const map: Record<string, string> = {
    queued:        'queued',
    ringing:       'ringing',
    'in-progress': 'in_progress',
    forwarding:    'in_progress',
    ended:         'completed',
  }
  return map[vapiStatus] ?? vapiStatus
}

export async function GET(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const callId = request.nextUrl.searchParams.get('callId')
  if (!callId) return Response.json({ error: 'callId requis' }, { status: 400 })

  // Appel REST direct à l'API Vapi (évite les problèmes de types SDK)
  let vapiCall: any
  try {
    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
    })
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Vapi: ${err}` }, { status: res.status })
    }
    vapiCall = await res.json()
  } catch (err: any) {
    return Response.json({ error: err?.message ?? 'Erreur Vapi' }, { status: 500 })
  }

  const status  = mapStatus(vapiCall.status ?? '')
  const outcome = vapiCall.analysis?.structuredData?.outcome ?? null
  const durationSeconds = Math.round(
    vapiCall.endedAt && vapiCall.startedAt
      ? (new Date(vapiCall.endedAt).getTime() - new Date(vapiCall.startedAt).getTime()) / 1000
      : 0
  )

  // Met à jour en base
  await adminSupabase()
    .from('calls')
    .update({
      status,
      ...(outcome           ? { outcome }                          : {}),
      ...(durationSeconds   ? { duration_seconds: durationSeconds } : {}),
      ...(vapiCall.startedAt ? { started_at: vapiCall.startedAt }  : {}),
      ...(vapiCall.endedAt   ? { ended_at:    vapiCall.endedAt   } : {}),
    })
    .eq('vapi_call_id', callId)
    .eq('organization_id', orgId)

  return Response.json({ callId, status, outcome, durationSeconds })
}
