import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  const { company_name, contact_name, city, industry } = await request.json()

  if (!company_name) {
    return Response.json({ error: 'company_name requis' }, { status: 400 })
  }

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/vocalab'

  const prompt = `Tu es un expert en prospection B2B française.
Génère un email de prospection court et percutant pour contacter cette entreprise :
- Entreprise : ${company_name}
- Contact : ${contact_name ?? 'le dirigeant'}
- Ville : ${city ?? 'France'}
- Secteur : ${industry ?? 'inconnu'}

L'email doit :
- Faire maximum 5 lignes
- Être naturel et humain, pas robotique ni trop commercial
- Mentionner un bénéfice concret lié au secteur
- Se terminer par une proposition de RDV avec ce lien Calendly : ${calendlyUrl}
- Avoir un objet accrocheur en 6 mots maximum

Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks) :
{"subject":"objet de l email","body":"corps de l email en HTML simple (<p> uniquement)"}`

  const message = await client.messages.create({
    model:      'claude-opus-4-7',
    max_tokens: 800,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: { subject: string; body: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return Response.json({ error: 'Réponse IA invalide' }, { status: 500 })
    parsed = JSON.parse(match[0])
  }

  return Response.json(parsed)
}
