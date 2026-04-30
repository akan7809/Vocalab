import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function adminClient() {
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

// GET — liste les leads avec filtres optionnels
export async function GET(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const industry = searchParams.get('industry')
  const city     = searchParams.get('city')
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10)
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  const admin = adminClient()

  // Count
  let countQ = admin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if (status)   countQ = countQ.eq('status', status)
  if (industry) countQ = countQ.eq('industry', industry)
  if (city)     countQ = countQ.ilike('city', `%${city}%`)
  const { count } = await countQ

  // Data
  let dataQ = admin
    .from('leads')
    .select('id, company_name, contact_name, phone, city, industry, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (status)   dataQ = dataQ.eq('status', status)
  if (industry) dataQ = dataQ.eq('industry', industry)
  if (city)     dataQ = dataQ.ilike('city', `%${city}%`)

  const { data, error } = await dataQ
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data, count, page, pageSize })
}

// POST — insère un ou plusieurs leads
export async function POST(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const leads = Array.isArray(body) ? body : [body]

  const rows = leads.map(l => ({
    ...l,
    organization_id: orgId,
    status: l.status ?? 'pending',
    source: l.source ?? 'manual',
    country: l.country ?? 'FR',
  }))

  const { data, error } = await adminClient()
    .from('leads')
    .insert(rows)
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data, count: data?.length ?? 0 })
}
