import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { transporter } from '@/lib/mailer'

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

  const { leadId, subject, body } = await request.json()

  if (!leadId || !subject || !body) {
    return Response.json({ error: 'leadId, subject et body requis' }, { status: 400 })
  }

  const admin = adminSupabase()

  // Récupère le lead
  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, company_name, contact_name, email, organization_id')
    .eq('id', leadId)
    .eq('organization_id', orgId)
    .single()

  if (leadError || !lead) {
    return Response.json({ error: 'Lead introuvable' }, { status: 404 })
  }

  if (!lead.email) {
    return Response.json({ error: 'Ce lead n\'a pas d\'adresse email' }, { status: 422 })
  }

  // Envoie l'email
  try {
    await transporter.sendMail({
      from:    `"Vocalab" <${process.env.IONOS_EMAIL}>`,
      to:      lead.email,
      subject,
      html:    body,
    })
  } catch (err: any) {
    console.error('SMTP error:', err)
    // Log l'échec
    await admin.from('email_logs').insert({
      organization_id: orgId,
      lead_id:         leadId,
      subject,
      body,
      status:          'bounced',
    })
    return Response.json({ error: `Erreur SMTP : ${err.message}` }, { status: 500 })
  }

  // Log l'envoi en base
  await admin.from('email_logs').insert({
    organization_id: orgId,
    lead_id:         leadId,
    subject,
    body,
    status:          'sent',
  })

  return Response.json({ success: true, to: lead.email })
}
