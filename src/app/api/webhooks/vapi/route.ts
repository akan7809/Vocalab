import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const OUTCOME_MAP: Record<string, string> = {
  interested:     'interested',
  not_interested: 'not_interested',
  'not-interested': 'not_interested',
  callback:       'callback',
  converted:      'converted',
  no_answer:      'no_answer',
  'no-answer':    'no_answer',
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = body?.message ?? body
  const type    = message?.type ?? body?.type

  // On ne traite que le rapport de fin d'appel
  if (type !== 'end-of-call-report') {
    return Response.json({ received: true })
  }

  const vapiCallId      = message?.call?.id ?? message?.callId
  const transcript      = message?.transcript      ?? null
  const summary         = message?.summary         ?? null
  const durationSeconds = Math.round(message?.call?.duration ?? message?.durationSeconds ?? 0)

  // Outcome : extrait depuis l'analyse structurée ou le summary
  let rawOutcome = message?.analysis?.structuredData?.outcome
    ?? message?.analysis?.summary
    ?? null
  const outcome = rawOutcome ? (OUTCOME_MAP[rawOutcome.toLowerCase()] ?? null) : null

  if (!vapiCallId) {
    console.warn('Webhook Vapi reçu sans callId')
    return Response.json({ received: true })
  }

  const admin = adminSupabase()

  // Met à jour la table calls
  const { data: callRow } = await admin
    .from('calls')
    .update({
      status:           'completed',
      transcript:       transcript,
      summary:          summary,
      duration_seconds: durationSeconds,
      ...(outcome ? { outcome } : {}),
      ended_at:         new Date().toISOString(),
    })
    .eq('vapi_call_id', vapiCallId)
    .select('lead_id')
    .single()

  // Met à jour le statut du lead si outcome connu
  if (callRow?.lead_id && outcome && OUTCOME_MAP[outcome]) {
    await admin
      .from('leads')
      .update({ status: outcome })
      .eq('id', callRow.lead_id)
  } else if (callRow?.lead_id) {
    // Au minimum, passe le lead à 'called'
    await admin
      .from('leads')
      .update({ status: 'called' })
      .eq('id', callRow.lead_id)
  }

  return Response.json({ received: true })
}
