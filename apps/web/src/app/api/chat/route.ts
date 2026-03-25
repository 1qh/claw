/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/** biome-ignore-all lint/nursery/noNestedPromises: async cleanup in event handler */
/* oxlint-disable use-exports-last, promise/prefer-await-to-then, promise/always-return */
import { connectToGateway } from '@a/control-plane/connect'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { chatMessages } from '~/lib/db-schema'
import { env } from '~/lib/env'
export const runtime = 'nodejs'
interface ChatPayload {
  message?: { content?: { text?: string; type: string }[]; role?: string }
  state?: string
}
const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  const body = (await request.json()) as {
      messages?: { parts?: { text?: string; type: string }[]; role: string }[]
      sessionKey?: string
    },
    allMessages = (body.messages ?? [])
      .map(m => ({
        content:
          m.parts
            ?.filter(p => p.type === 'text')
            .map(p => p.text ?? '')
            .join('') ?? '',
        role: m.role
      }))
      .filter(m => m.content),
    lastUserMsg = allMessages.findLast(m => m.role === 'user')
  if (!lastUserMsg) return new Response('Missing message', { status: 400 })
  const sessionKey = body.sessionKey ?? `agent:main:${session.user.id}-${Date.now()}`,
    contextParts: string[] = []
  for (const m of allMessages.slice(0, -1))
    contextParts.push(`[${m.role === 'user' ? 'User' : 'Assistant'}]: ${m.content}`)
  const messageWithContext =
    contextParts.length > 0 ? `${contextParts.join('\n')}\n\n[User]: ${lastUserMsg.content}` : lastUserMsg.content
  await db.insert(chatMessages).values({ content: lastUserMsg.content, role: 'user', sessionKey, userId: session.user.id })
  const conn = await connectToGateway({
      host: env.GATEWAY_HOST,
      password: env.GATEWAY_PASSWORD,
      port: Number(env.GATEWAY_PORT)
    }),
    responseText = await new Promise<string>((resolve, reject) => {
      let fullText = ''
      const timeout = setTimeout(() => {
        conn.close()
        resolve(fullText || 'No response')
      }, 60_000)
      conn.onEvent(e => {
        if (e.type === 'res' && !e.ok) {
          clearTimeout(timeout)
          conn.close()
          reject(new Error(`WS error: ${JSON.stringify(e.error)}`))
          return
        }
        if (e.type === 'event' && e.event === 'chat') {
          const payload = e.payload as ChatPayload
          if (payload.state === 'delta' && payload.message?.content) {
            const delta = payload.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text ?? '')
              .join('')
            if (delta) fullText += delta
          }
          if (payload.state === 'final') {
            clearTimeout(timeout)
            if (!fullText && payload.message?.content)
              fullText = payload.message.content
                .filter(c => c.type === 'text')
                .map(c => c.text ?? '')
                .join('')
            conn.close()
            resolve(fullText)
          }
          if (payload.state === 'error') {
            clearTimeout(timeout)
            conn.close()
            reject(new Error(`Chat error: ${JSON.stringify(payload)}`))
          }
        }
      })
      conn.send('chat.send', {
        idempotencyKey: `${session.user.id}-${Date.now()}`,
        message: messageWithContext,
        sessionKey
      })
    })
  await db.insert(chatMessages).values({ content: responseText, role: 'assistant', sessionKey, userId: session.user.id })
  return new Response(responseText, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
export { POST }
