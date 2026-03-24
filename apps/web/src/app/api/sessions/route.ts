/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* eslint-disable max-depth */
/* oxlint-disable use-exports-last */
import { eq, like } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState } from '~/lib/db-schema'
export const runtime = 'nodejs'
const extractFirstUserMessage = (raw: string): string => {
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('{'))
        try {
          const entry = JSON.parse(trimmed) as {
            message?: { content?: { text?: string; type: string }[]; role?: string }
            type: string
          }
          if (entry.type === 'message' && entry.message?.role === 'user') {
            const text = (entry.message.content ?? [])
              .filter(c => c.type === 'text')
              .map(c => c.text ?? '')
              .join('')
            if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text
          }
        } catch {
          /* Malformed line */
        }
      else {
        /* Skip non-JSON */
      }
    }
    return ''
  },
  GET = async (request: Request) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })
    const indexRows = await db
      .select({ body: tigerfsState.body })
      .from(tigerfsState)
      .where(eq(tigerfsState.filename, 'agents/main/sessions/sessions.json'))
      .limit(1)
    if (indexRows.length === 0 || !indexRows[0].body) return Response.json([])
    const store = JSON.parse(indexRows[0].body) as Record<string, { sessionId?: string; updatedAt?: number }>,
      entries: { key: string; sessionId: string; updatedAt: number }[] = []
    for (const [key, val] of Object.entries(store))
      if (val.sessionId) entries.push({ key, sessionId: val.sessionId, updatedAt: val.updatedAt ?? 0 })
    entries.sort((a, b) => b.updatedAt - a.updatedAt)
    const transcriptRows = await db
        .select({ body: tigerfsState.body, encoding: tigerfsState.encoding, filename: tigerfsState.filename })
        .from(tigerfsState)
        .where(like(tigerfsState.filename, 'agents/main/sessions/%.jsonl')),
      transcriptMap = new Map<string, string>()
    for (const row of transcriptRows)
      if (row.body) {
        const sessionId = row.filename.replace('agents/main/sessions/', '').replace('.jsonl', ''),
          raw = row.encoding === 'base64' ? Buffer.from(row.body, 'base64').toString('utf8') : row.body
        transcriptMap.set(sessionId, extractFirstUserMessage(raw))
      }
    return Response.json(
      entries
        .filter(e => transcriptMap.has(e.sessionId))
        .map(e => ({
          firstMessage: transcriptMap.get(e.sessionId) ?? '',
          key: e.key,
          sessionId: e.sessionId,
          updatedAt: e.updatedAt
        }))
        .filter(s => s.firstMessage)
    )
  }
export { GET }
