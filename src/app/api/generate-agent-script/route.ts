import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  const { name, type, language, industry, objective } = await request.json()

  if (!name || !type || !industry || !objective) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const langLabel = language === 'fr' ? 'français' : language === 'en' ? 'anglais' : 'arabe'
  const typeLabel = type === 'outbound' ? 'appels sortants (prospection)' : 'appels entrants (support/réception)'

  const prompt = `Tu es un expert en scripts d'agents vocaux IA pour la prospection commerciale B2B.

Génère un script complet pour un agent vocal IA avec ces caractéristiques :
- Nom de l'agent : ${name}
- Type : ${typeLabel}
- Langue : ${langLabel}
- Secteur cible : ${industry}
- Objectif principal : ${objective}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) contenant exactement ces deux clés :

{
  "system_prompt": "Instructions complètes pour l'agent (200-400 mots). Inclure : rôle, ton, règles de conversation, gestion des objections, étapes de l'appel, comment conclure.",
  "first_message": "Le premier message que l'agent dit en décrochant (1-2 phrases, naturel et professionnel, en ${langLabel})."
}`

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: { system_prompt: string; first_message: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback: try to extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return Response.json({ error: 'Réponse IA invalide' }, { status: 500 })
    }
    parsed = JSON.parse(match[0])
  }

  return Response.json(parsed)
}
