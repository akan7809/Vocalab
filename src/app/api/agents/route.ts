import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

export async function POST(request: NextRequest) {
  console.log('=== API AGENTS POST ===')

  const supabase = await getSessionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('User:', user?.id, 'AuthError:', authError?.message)

  if (!user) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  console.log('UserData:', userData)

  const body = await request.json()
  console.log('Body reçu:', body)

  const { data, error } = await adminClient()
    .from('agents')
    .insert({ ...body, organization_id: userData?.organization_id, status: 'inactive' })
    .select()
    .single()

  if (error) {
    console.log('Supabase error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
