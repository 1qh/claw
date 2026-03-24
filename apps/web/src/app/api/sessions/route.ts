/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState } from '~/lib/db-schema'
export const runtime = 'nodejs'
const GET = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const rows = await db
    .select({ body: tigerfsState.body, modifiedAt: tigerfsState.modifiedAt })
    .from(tigerfsState)
    .where(eq(tigerfsState.filename, 'agents/main/sessions/sessions.json'))
    .limit(1)
  if (rows.length === 0 || !rows[0].body) return Response.json([])
  const store = JSON.parse(rows[0].body) as Record<string, { sessionId?: string; updatedAt?: number }>,
    sessions: { key: string; sessionId: string; updatedAt: number }[] = []
  for (const [key, val] of Object.entries(store))
    if (val.sessionId)
      sessions.push({
        key,
        sessionId: val.sessionId,
        updatedAt: val.updatedAt ?? 0
      })
  sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  return Response.json(sessions)
}
export { GET }
