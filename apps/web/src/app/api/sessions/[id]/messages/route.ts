/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { chatMessages } from '~/lib/db-schema'
export const runtime = 'nodejs'
const GET = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id } = await params,
    sessionKey = decodeURIComponent(id),
    rows = await db
      .select({ content: chatMessages.content, role: chatMessages.role })
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionKey, sessionKey), eq(chatMessages.userId, session.user.id)))
      .orderBy(asc(chatMessages.createdAt))
  return Response.json(rows)
}
export { GET }
