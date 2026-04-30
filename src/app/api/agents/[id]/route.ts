import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function adminClient() {
  return createClient(
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
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

// PATCH — modifier un agent
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const { error } = await adminClient()
    .from('agents')
    .update(body)
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

// DELETE — supprimer un agent
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const { error } = await adminClient()
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
