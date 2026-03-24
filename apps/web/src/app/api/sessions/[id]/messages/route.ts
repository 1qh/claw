/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState } from '~/lib/db-schema'
export const runtime = 'nodejs'
interface TranscriptEntry {
  message?: {
    content?: { text?: string; type: string }[]
    role?: string
  }
  type: string
}
const GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params,
    rows = await db
      .select({ body: tigerfsState.body, encoding: tigerfsState.encoding })
      .from(tigerfsState)
      .where(eq(tigerfsState.filename, `agents/main/sessions/${id}.jsonl`))
      .limit(1)
  if (rows.length === 0 || !rows[0].body) return Response.json([])
  const raw = rows[0].encoding === 'base64' ? Buffer.from(rows[0].body, 'base64').toString('utf8') : rows[0].body,
    lines = raw.split('\n').filter(l => l.trim().startsWith('{')),
    messages: { content: string; role: string }[] = []
  for (const line of lines)
    try {
      const entry = JSON.parse(line) as TranscriptEntry
      if (entry.type === 'message' && entry.message?.role && entry.message.content) {
        const text = entry.message.content
          .filter(c => c.type === 'text')
          .map(c => c.text ?? '')
          .join('')
        if (text) messages.push({ content: text, role: entry.message.role })
      }
    } catch {
      /* Skip malformed lines */
    }
  return Response.json(messages)
}
export { GET }
