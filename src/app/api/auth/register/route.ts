import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Admin client with service role — bypasses RLS for registration flow
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, firstName, company, slug } = await request.json()

    if (!userId || !email || !company || !slug) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Créer l'organization
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: company, slug, plan: 'starter' })
      .select('id')
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Erreur création organisation : ' + orgError?.message },
        { status: 500 }
      )
    }

    // 2. Créer le profil user lié à l'organization
    const { error: userError } = await admin.from('users').insert({
      id: userId,
      organization_id: org.id,
      email,
      full_name: firstName,
      role: 'owner',
    })

    if (userError) {
      // Rollback org if user insert fails
      await admin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { error: 'Erreur création profil : ' + userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ organizationId: org.id })
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur inattendue.' }, { status: 500 })
  }
}
