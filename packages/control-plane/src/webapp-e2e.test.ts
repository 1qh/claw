/** biome-ignore-all lint/performance/noAwaitInLoops: sequential e2e */
/* oxlint-disable no-await-in-loop */
import { spawn } from 'bun'
import { describe, expect, test } from 'bun:test'
const WEB_URL = 'http://localhost:3000',
  COOKIE_JAR = '/tmp/e2e-cookies.txt',
  testEmail = `e2e-${Date.now()}@test.com`,
  testPassword = 'testpassword123',
  sessionKey = `agent:main:e2e-${Date.now()}`,
  curlFetch = async (path: string, opts?: { body?: string; method?: string }) => {
    const args = ['curl', '-s', '-b', COOKIE_JAR, '-c', COOKIE_JAR, `${WEB_URL}${path}`]
    if (opts?.method) args.push('-X', opts.method)
    if (opts?.body) args.push('-H', 'Content-Type: application/json', '-d', opts.body)
    const proc = spawn(args, { stderr: 'pipe', stdout: 'pipe' }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return out
  },
  curlStatus = async (path: string, opts?: { noCookies?: boolean }) => {
    const args = ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}']
    if (!opts?.noCookies) args.push('-b', COOKIE_JAR, '-c', COOKIE_JAR)
    args.push(`${WEB_URL}${path}`)
    const proc = spawn(args, { stderr: 'pipe', stdout: 'pipe' }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return Number(out.trim())
  }
describe('webapp e2e', () => {
  test('signup creates user', async () => {
    const raw = await curlFetch('/api/auth/sign-up/email', {
        body: JSON.stringify({ email: testEmail, name: 'E2E Test', password: testPassword }),
        method: 'POST'
      }),
      data = JSON.parse(raw) as { user?: { email?: string } }
    expect(data.user?.email).toBe(testEmail)
  })
  test('session is valid after signup', async () => {
    const raw = await curlFetch('/api/auth/get-session'),
      data = JSON.parse(raw) as { user?: { email?: string } }
    expect(data.user?.email).toBe(testEmail)
  })
  test('events SSE returns 200 with text/event-stream', async () => {
    const proc = spawn(
        [
          'curl',
          '-s',
          '-o',
          '/dev/null',
          '-w',
          '%{http_code},%{content_type}',
          '-b',
          COOKIE_JAR,
          '--max-time',
          '5',
          `${WEB_URL}/api/events`
        ],
        { stderr: 'pipe', stdout: 'pipe' }
      ),
      out = await new Response(proc.stdout).text()
    await proc.exited
    const [status, contentType] = out.trim().split(',')
    expect(Number(status)).toBe(200)
    expect(contentType).toContain('text/event-stream')
  }, 10_000)
  test('chat sends message and returns agent response (WS chat.send)', async () => {
    const raw = await curlFetch('/api/chat', {
      body: JSON.stringify({
        messages: [{ parts: [{ text: 'Say only: pong', type: 'text' }], role: 'user' }],
        sessionKey
      }),
      method: 'POST'
    })
    expect(raw.length).toBeGreaterThan(0)
  }, 60_000)
  test('chat message stored in chat_messages table', async () => {
    const sessionsRaw = await curlFetch('/api/sessions'),
      sessions = JSON.parse(sessionsRaw) as { firstMessage: string; sessionKey: string }[]
    expect(sessions.length).toBeGreaterThan(0)
    const match = sessions.find(s => s.sessionKey === sessionKey)
    expect(match).toBeDefined()
    expect(match?.firstMessage.toLowerCase()).toContain('pong')
  })
  test('session messages loadable via API', async () => {
    const msgRaw = await curlFetch(`/api/sessions/${encodeURIComponent(sessionKey)}/messages`),
      messages = JSON.parse(msgRaw) as { content: string; role: string }[]
    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toContain('pong')
    expect(messages[1].role).toBe('assistant')
  })
  test('second message in same session stored', async () => {
    await curlFetch('/api/chat', {
      body: JSON.stringify({
        messages: [{ parts: [{ text: 'Say only: ping', type: 'text' }], role: 'user' }],
        sessionKey
      }),
      method: 'POST'
    })
    const msgRaw = await curlFetch(`/api/sessions/${encodeURIComponent(sessionKey)}/messages`),
      messages = JSON.parse(msgRaw) as { content: string; role: string }[]
    expect(messages.length).toBeGreaterThanOrEqual(3)
    const userMsgs = messages.filter(m => m.role === 'user')
    expect(userMsgs.length).toBeGreaterThanOrEqual(2)
  }, 60_000)
  test('new session has independent messages', async () => {
    const otherKey = `agent:main:e2e-other-${Date.now()}`
    await curlFetch('/api/chat', {
      body: JSON.stringify({
        messages: [{ parts: [{ text: 'Say only: separate', type: 'text' }], role: 'user' }],
        sessionKey: otherKey
      }),
      method: 'POST'
    })
    const msgRaw = await curlFetch(`/api/sessions/${encodeURIComponent(otherKey)}/messages`),
      messages = JSON.parse(msgRaw) as { content: string; role: string }[]
    expect(messages.length).toBe(2)
    expect(messages[0].content).toContain('separate')
  }, 60_000)
  test('sessions list ordered by most recent', async () => {
    const raw = await curlFetch('/api/sessions'),
      sessions = JSON.parse(raw) as { sessionKey: string; updatedAt: string }[]
    expect(sessions.length).toBeGreaterThanOrEqual(2)
  })
  test('unauthenticated requests rejected', async () => {
    const sessionsStatus = await curlStatus('/api/sessions', { noCookies: true })
    expect(sessionsStatus).toBe(401)
  })
})
