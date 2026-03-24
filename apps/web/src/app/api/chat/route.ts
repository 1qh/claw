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
    lastMessage = body.messages?.at(-1),
    text =
      lastMessage?.parts
        ?.filter(p => p.type === 'text')
        .map(p => p.text ?? '')
        .join('') ?? ''
  if (!text) return new Response('Missing message', { status: 400 })
  const sessionKey = body.sessionKey ?? `agent:main:${session.user.id}-${Date.now()}`
  await db.insert(chatMessages).values({
    content: text,
    role: 'user',
    sessionKey,
    userId: session.user.id
  })
  const conn = await connectToGateway({
    host: env.GATEWAY_HOST,
    password: env.GATEWAY_PASSWORD,
    port: Number(env.GATEWAY_PORT)
  })
  let fullText = ''
  const textStream = new ReadableStream<string>({
    start: controller => {
      conn.onEvent(e => {
        if (e.type === 'event' && e.event === 'chat') {
          const payload = e.payload as ChatPayload
          if (payload.state === 'delta' && payload.message?.content) {
            const delta = payload.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text ?? '')
              .join('')
            if (delta) {
              fullText += delta
              controller.enqueue(delta)
            }
          }
          if (payload.state === 'final') {
            if (payload.message?.content) {
              const finalText = payload.message.content
                .filter(c => c.type === 'text')
                .map(c => c.text ?? '')
                .join('')
              if (finalText && !fullText) {
                fullText = finalText
                controller.enqueue(finalText)
              }
            }
            db.insert(chatMessages)
              .values({
                content: fullText,
                role: 'assistant',
                sessionKey,
                userId: session.user.id
              })
              .then(() => {
                controller.close()
                conn.close()
              })
              .catch(() => {
                controller.close()
                conn.close()
              })
          }
          if (payload.state === 'error') {
            controller.close()
            conn.close()
          }
        }
      })
      conn.send('chat.send', {
        idempotencyKey: `${session.user.id}-${Date.now()}`,
        message: text,
        sessionKey
      })
    }
  })
  return new Response(textStream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'transfer-encoding': 'chunked' }
  })
}
export { POST }
