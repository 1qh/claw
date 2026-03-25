/** biome-ignore-all lint/style/useExportsLast: Next.js route segment config requires inline export */
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
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
    baseURL: `http://${env.GATEWAY_HOST}:${env.GATEWAY_PORT}/v1`
  }),
  POST = async (request: Request) => {
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
      model: gateway(env.OPENCLAW_MODEL),
      onFinish: async ({ text }) => {
        await db
          .insert(chatMessages)
          .values({ content: text || 'No response', role: 'assistant', sessionKey, userId: session.user.id })
      },
      system:
        'You are a helpful assistant. Always respond with a text answer. Never end your turn without providing a text response to the user.'
    })
    return result.toDataStreamResponse()
  }
export { POST }
