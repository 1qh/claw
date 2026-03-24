/** biome-ignore-all lint/performance/noAwaitInLoops: sequential stream reads */
/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* oxlint-disable use-exports-last */
/* eslint-disable no-await-in-loop, max-depth */
import { createTextStreamResponse } from 'ai'
import { auth } from '~/lib/auth'
import { env } from '~/lib/env'
export const runtime = 'nodejs'
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
      .filter(m => m.content)
  if (allMessages.length === 0) return new Response('Missing message', { status: 400 })
  const gatewayUrl = `http://${env.GATEWAY_HOST}:${env.GATEWAY_PORT}/v1/chat/completions`,
    sessionKey = body.sessionKey ?? `agent:main:${session.user.id}-${Date.now()}`,
    upstream = await fetch(gatewayUrl, {
      body: JSON.stringify({
        messages: allMessages,
        model: env.OPENCLAW_MODEL,
        stream: true
      }),
      headers: {
        authorization: `Bearer ${env.GATEWAY_PASSWORD}`,
        'content-type': 'application/json',
        'x-openclaw-session-key': sessionKey
      },
      method: 'POST'
    })
  if (!(upstream.ok && upstream.body)) return new Response(`Gateway error: ${upstream.status}`, { status: 502 })
  const reader = upstream.body.getReader(),
    decoder = new TextDecoder(),
    textStream = new ReadableStream<string>({
      pull: async controller => {
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines)
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') {
                controller.close()
                return
              }
              try {
                const chunk = JSON.parse(payload) as {
                    choices?: { delta?: { content?: string } }[]
                  },
                  delta = chunk.choices?.[0]?.delta?.content
                if (delta) controller.enqueue(delta)
              } catch {
                /* Malformed chunk */
              }
            }
        }
      }
    })
  return createTextStreamResponse({ textStream })
}
export { POST }
