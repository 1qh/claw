/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/** biome-ignore-all lint/suspicious/useAwait: fetch middleware */
/* oxlint-disable use-exports-last */
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { auth } from '~/lib/auth'
import { db } from '~/lib/db'
import { chatMessages } from '~/lib/db-schema'
import { env } from '~/lib/env'
export const runtime = 'nodejs'
const gateway = createOpenAI({
    apiKey: env.GATEWAY_PASSWORD,
    baseURL: `http://${env.GATEWAY_HOST}:${env.GATEWAY_PORT}/v1`,
    fetch: async (url, init) => {
      const urlStr = url instanceof URL ? url.href : url instanceof Request ? url.url : url
      if (urlStr.includes('/v1/responses') && typeof init?.body === 'string') {
        const parsed = JSON.parse(init.body) as { input?: { role?: string; type?: string }[] }
        if (Array.isArray(parsed.input))
          for (const item of parsed.input) if (item.role && !item.type) item.type = 'message'
        return fetch(url, { ...init, body: JSON.stringify(parsed) })
      }
      return fetch(url, init)
    }
  }),
  POST = async (request: Request) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session) return new Response('Unauthorized', { status: 401 })
      const body = (await request.json()) as { messages: { content: string; role: string }[]; sessionKey?: string },
        lastUserMsg = body.messages.findLast(m => m.role === 'user'),
        userContent = lastUserMsg?.content ?? ''
      if (!userContent) return new Response('Missing message', { status: 400 })
      const sessionKey = body.sessionKey ?? `agent:main:${session.user.id}-${Date.now()}`
      await db.insert(chatMessages).values({ content: userContent, role: 'user', sessionKey, userId: session.user.id })
      const result = streamText({
        messages: body.messages.map(m => ({ content: m.content, role: m.role as 'assistant' | 'system' | 'user' })),
        model: gateway('openclaw'),
        onFinish: async ({ text }) => {
          await db
            .insert(chatMessages)
            .values({ content: text || 'No response', role: 'assistant', sessionKey, userId: session.user.id })
        },
        system:
          'You are a helpful assistant. Always respond with a text answer. Never end your turn without providing a text response to the user.'
      })
      return result.toTextStreamResponse()
    } catch (chatError) {
      return new Response(String(chatError), { status: 500 })
    }
  }
export { POST }
