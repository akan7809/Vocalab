import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { vapi } from '@/lib/vapi'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getSessionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}

async function getOrgId(): Promise<string | null> {
  const supabase = await getSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  return data?.organization_id ?? null
}

export async function POST(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { leadId, agentId } = await request.json()
  if (!leadId || !agentId) {
    return Response.json({ error: 'leadId et agentId requis' }, { status: 400 })
  }

  const admin = adminSupabase()

  // Récupère le lead
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('id, contact_name, company_name, phone')
    .eq('id', leadId)
    .eq('organization_id', orgId)
    .single()

  if (leadErr || !lead) return Response.json({ error: 'Lead introuvable' }, { status: 404 })
  if (!lead.phone)       return Response.json({ error: 'Ce lead n\'a pas de numéro de téléphone' }, { status: 422 })

  // Récupère l'agent
  const { data: agent, error: agentErr } = await admin
    .from('agents')
    .select('id, name, vapi_agent_id, system_prompt, first_message, voice_id')
    .eq('id', agentId)
    .eq('organization_id', orgId)
    .single()

  if (agentErr || !agent) return Response.json({ error: 'Agent introuvable' }, { status: 404 })

  // Lance l'appel Vapi
  let call: any
  try {
    call = await vapi.calls.create({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID!,
      customer: {
        number: lead.phone,
        name:   lead.contact_name || lead.company_name || undefined,
      },
      assistant: {
        firstMessage: agent.first_message ?? undefined,
        model: {
          provider:     'anthropic',
          model:        'claude-sonnet-4-20250514',
          systemPrompt: agent.system_prompt ?? undefined,
        } as any,
        voice: {
          provider: 'elevenlabs',
          voiceId:  agent.voice_id || 'EXAVITQu4vr4xnSDxMaL',
        } as any,
        endCallFunctionEnabled: true,
        recordingEnabled:       true,
      } as any,
    })
  } catch (err: any) {
    console.error('Vapi call error:', err)
    return Response.json({ error: err?.message ?? 'Erreur Vapi' }, { status: 500 })
  }

  // Sauvegarde dans calls
  await admin.from('calls').insert({
    organization_id: orgId,
    lead_id:         leadId,
    agent_id:        agentId,
    vapi_call_id:    call.id,
    status:          'queued',
  })

  // Met à jour le statut du lead
  await admin.from('leads').update({ status: 'calling' }).eq('id', leadId)

  return Response.json({ callId: call.id })
}
