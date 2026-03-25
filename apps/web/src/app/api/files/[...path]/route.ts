/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState, tigerfsWorkspace } from '~/lib/db-schema'
export const runtime = 'nodejs'
const GET = async (request: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { path } = await params,
    fullPath = path.join('/'),
    isWorkspace = fullPath.startsWith('workspace/'),
    table = isWorkspace ? tigerfsWorkspace : tigerfsState,
    dbPath = isWorkspace ? fullPath.slice('workspace/'.length) : fullPath.slice('state/'.length),
    rows = await db
      .select({ body: table.body, encoding: table.encoding })
      .from(table)
      .where(eq(table.filename, dbPath))
      .limit(1)
  if (rows.length === 0 || !rows[0].body) return new Response('Not found', { status: 404 })
  const content = rows[0].encoding === 'base64' ? Buffer.from(rows[0].body, 'base64').toString('utf8') : rows[0].body
  return new Response(content, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
export { GET }
