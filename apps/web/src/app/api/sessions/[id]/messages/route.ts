/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* eslint-disable max-depth, @typescript-eslint/no-unnecessary-condition */
/* oxlint-disable use-exports-last */
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState } from '~/lib/db-schema'
export const runtime = 'nodejs'
interface TranscriptEntry {
  message?: TranscriptMessage
  type: string
}
interface TranscriptMessage {
  content: { text?: string; type: string }[]
  role: string
}
const parseTranscript = (raw: string): { content: string; role: string }[] => {
    const messages: { content: string; role: string }[] = []
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{'))
        try {
          const entry = JSON.parse(trimmed) as TranscriptEntry
          if (entry.type === 'message' && entry.message?.role && entry.message.content) {
            const text = entry.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text ?? '')
              .join('')
            if (text && (entry.message.role === 'user' || entry.message.role === 'assistant'))
              messages.push({ content: text, role: entry.message.role })
          }
        } catch {
          /* Malformed line */
        }
    }
    return messages
  },
  GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })
    const { id } = await params,
      rows = await db
        .select({ body: tigerfsState.body, encoding: tigerfsState.encoding })
        .from(tigerfsState)
        .where(eq(tigerfsState.filename, `agents/main/sessions/${id}.jsonl`))
        .limit(1)
    if (rows.length === 0 || !rows[0].body) return Response.json([])
    const raw = rows[0].encoding === 'base64' ? Buffer.from(rows[0].body, 'base64').toString('utf8') : rows[0].body
    return Response.json(parseTranscript(raw))
  }
export { GET }
