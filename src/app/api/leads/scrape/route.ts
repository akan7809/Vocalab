import { ApifyClient } from 'apify-client'
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

// POST — démarre le run Apify et retourne immédiatement le runId
export async function POST(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { industry, city, count } = await request.json()

  if (!industry || !city || !count) {
    return Response.json({ error: 'Paramètres manquants (industry, city, count)' }, { status: 400 })
  }

  const apifyToken = process.env.NEXT_PUBLIC_APIFY_API_KEY
  if (!apifyToken) {
    return Response.json({ error: 'NEXT_PUBLIC_APIFY_API_KEY non configurée' }, { status: 500 })
  }

  const client = new ApifyClient({ token: apifyToken })

  const input = {
    searchStringsArray:        [`${industry} ${city}`],
    countryCode:               'fr',
    maxCrawledPlaces:          count,
    maxCrawledPlacesPerSearch: count,
    language:                  'fr',
  }

  try {
    const run = await client.actor('nwua9Gu5YrADL7ZDj').start(input, {
      memory: 256,
    })

    return Response.json({ runId: run.id, status: 'started' })
  } catch (err: any) {
    console.error('Apify start error:', err)
    return Response.json({ error: err?.message ?? 'Erreur Apify' }, { status: 500 })
  }
}

// GET — poll le statut du run, sauvegarde les résultats si terminé
export async function GET(request: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const runId   = searchParams.get('runId')
  const industry = searchParams.get('industry') ?? ''
  const city     = searchParams.get('city')     ?? ''
  const count    = parseInt(searchParams.get('count') ?? '200', 10)

  if (!runId) return Response.json({ error: 'runId manquant' }, { status: 400 })

  const client = new ApifyClient({ token: process.env.NEXT_PUBLIC_APIFY_API_KEY! })

  try {
    const runInfo = await client.run(runId).get()
    if (!runInfo) return Response.json({ status: 'running' })

    const { status } = runInfo

    // Toujours en cours
    if (status === 'RUNNING' || status === 'READY' || status === 'ABORTING') {
      return Response.json({ status: 'running' })
    }

    // Échec
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      return Response.json({ status: 'failed', error: `Run Apify ${status}` })
    }

    // Terminé avec succès
    if (status === 'SUCCEEDED') {
      const { items } = await client.dataset(runInfo.defaultDatasetId).listItems({
        limit: count,
      })

      if (!items.length) {
        return Response.json({ status: 'done', count: 0 })
      }

      // Transforme en format leads Supabase
      const leads = items
        .filter(item => item.title)
        .map(item => ({
          organization_id: orgId,
          company_name:    item.title                       ?? null,
          contact_name:    null,
          phone:           item.phone ?? (item.phoneUnformatted as string) ?? null,
          email:           null,
          website:         item.website                     ?? null,
          city:            (item.city as string)            ?? city  ?? null,
          industry:        (item.categoryName as string)    ?? industry ?? null,
          country:         'FR',
          source:          'apify',
          status:          'pending',
        }))

      if (!leads.length) {
        return Response.json({ status: 'done', count: 0 })
      }

      // Sauvegarde — insert simple (ignore les éventuelles erreurs de doublon)
      const { data, error } = await adminSupabase()
        .from('leads')
        .insert(leads)
        .select('id')

      if (error) {
        console.error('Supabase insert error:', error)
        return Response.json({ status: 'failed', error: error.message })
      }

      return Response.json({ status: 'done', count: data?.length ?? leads.length })
    }

    return Response.json({ status: 'running' })
  } catch (err: any) {
    console.error('Apify poll error:', err)
    return Response.json({ status: 'failed', error: err?.message ?? 'Erreur Apify' })
  }
}
