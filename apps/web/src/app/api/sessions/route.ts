/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { desc, eq, sql } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { chatMessages } from '~/lib/db-schema'
export const runtime = 'nodejs'
const GET = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const rows = await db
    .select({
      firstMessage: sql<string>`min(case when ${chatMessages.role} = 'user' then ${chatMessages.content} end)`,
      lastMessageAt: sql<Date>`max(${chatMessages.createdAt})`,
      sessionKey: chatMessages.sessionKey
    })
    .from(chatMessages)
    .where(eq(chatMessages.userId, session.user.id))
    .groupBy(chatMessages.sessionKey)
    .orderBy(desc(sql`max(${chatMessages.createdAt})`))
  return Response.json(
    rows
      .filter(r => r.firstMessage)
      .map(r => ({
        firstMessage: r.firstMessage.length > 60 ? `${r.firstMessage.slice(0, 60)}…` : r.firstMessage,
        sessionKey: r.sessionKey,
        updatedAt: r.lastMessageAt
      }))
  )
}
export { GET }
