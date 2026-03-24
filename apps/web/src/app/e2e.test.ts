/** biome-ignore-all lint/style/noProcessEnv: env config */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential stream read */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, no-await-in-loop */
import { afterAll, describe, expect, it } from 'bun:test'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
describe('e2e', () => {
  const email = `e2e-${Date.now()}@test.com`,
    password = 'E2eTestPass123!'
  let cookie: string
  afterAll(async () => {
    if (cookie)
      await fetch(`${BASE}/api/auth/sign-out`, {
        headers: { cookie },
        method: 'POST'
      })
  })
  it('signs up', async () => {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      body: JSON.stringify({ email, name: 'E2E User', password }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    expect(res.status).toBe(200)
    cookie = res.headers.getSetCookie().join('; ')
    expect(cookie.length).toBeGreaterThan(0)
  })
  it('has valid session', async () => {
    const res = await fetch(`${BASE}/api/auth/get-session`, {
      headers: { cookie }
    })
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data).toHaveProperty('user')
  })
  it('rejects unauthenticated chat', async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      body: JSON.stringify({
        messages: [{ id: 'x', parts: [{ text: 'hi', type: 'text' }], role: 'user' }]
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    expect(res.status).toBe(401)
  })
  it('streams chat response via AI SDK transport', async () => {
    const { TextStreamChatTransport } = await import('ai'),
      transport = new TextStreamChatTransport({ api: `${BASE}/api/chat`, headers: { cookie } }),
      stream = await transport.sendMessages({
        abortSignal: AbortSignal.timeout(170_000),
        chatId: 'chat1',
        messages: [{ id: 'msg1', parts: [{ text: 'Say hello in one word', type: 'text' }], role: 'user' }]
      }),
      reader = stream.getReader()
    let hasTextDelta = false
    for (let r = await reader.read(); !r.done; r = await reader.read())
      if (r.value.type === 'text-delta') hasTextDelta = true
    expect(hasTextDelta).toBe(true)
  }, 180_000)
})
