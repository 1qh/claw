/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { tigerfsState, tigerfsWorkspace } from '~/lib/db-schema'
export const runtime = 'nodejs'
interface TreeNode {
  children?: TreeNode[]
  name: string
  path: string
  type: 'directory' | 'file'
}
const buildTree = (files: { filename: string; filetype: string }[]): TreeNode[] => {
    const root: TreeNode = { children: [], name: '', path: '', type: 'directory' }
    for (const file of files) {
      const parts = file.filename.split('/')
      let current = root
      for (let i = 0; i < parts.length; i += 1) {
        const name = parts[i],
          path = parts.slice(0, i + 1).join('/'),
          isLast = i === parts.length - 1
        current.children ??= []
        let existing = current.children.find(c => c.name === name)
        if (!existing) {
          existing = { name, path, type: isLast && file.filetype === 'file' ? 'file' : 'directory' }
          if (existing.type === 'directory') existing.children = []
          current.children.push(existing)
        }
        current = existing
      }
    }
    return root.children ?? []
  },
  GET = async (request: Request) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return new Response('Unauthorized', { status: 401 })
    const workspaceRows = await db
        .select({ filename: tigerfsWorkspace.filename, filetype: tigerfsWorkspace.filetype })
        .from(tigerfsWorkspace),
      stateRows = await db.select({ filename: tigerfsState.filename, filetype: tigerfsState.filetype }).from(tigerfsState),
      allFiles = [
        ...workspaceRows
          .filter(r => !(r.filename.startsWith('.') || r.filename.includes('/.history')))
          .map(r => ({ filename: `workspace/${r.filename}`, filetype: r.filetype })),
        ...stateRows
          .filter(
            r => !(r.filename.startsWith('.') || r.filename.includes('/.history')) && r.filename.startsWith('agents/')
          )
          .map(r => ({ filename: `state/${r.filename}`, filetype: r.filetype }))
      ]
    return Response.json(buildTree(allFiles))
  }
export { GET }
