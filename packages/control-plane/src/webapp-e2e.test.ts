/** biome-ignore-all lint/performance/noAwaitInLoops: sequential e2e */
/* oxlint-disable no-await-in-loop */
import { spawn } from 'bun'
import { describe, expect, test } from 'bun:test'
const WEB_URL = 'http://localhost:3000',
  COOKIE_JAR = '/tmp/e2e-cookies.txt',
  testEmail = `e2e-${Date.now()}@test.com`,
  testPassword = 'testpassword123',
  curlFetch = async (path: string, opts?: { body?: string; method?: string }) => {
    const args = ['curl', '-s', '-b', COOKIE_JAR, '-c', COOKIE_JAR, `${WEB_URL}${path}`]
    if (opts?.method) args.push('-X', opts.method)
    if (opts?.body) args.push('-H', 'Content-Type: application/json', '-d', opts.body)
    const proc = spawn(args, { stderr: 'pipe', stdout: 'pipe' }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return out
  },
  curlStatus = async (path: string, opts?: { body?: string; method?: string; noCookies?: boolean }) => {
    const args = ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}']
    if (!opts?.noCookies) args.push('-b', COOKIE_JAR, '-c', COOKIE_JAR)
    args.push(`${WEB_URL}${path}`)
    if (opts?.method) args.push('-X', opts.method)
    if (opts?.body) args.push('-H', 'Content-Type: application/json', '-d', opts.body)
    const proc = spawn(args, { stderr: 'pipe', stdout: 'pipe' }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return Number(out.trim())
  }
describe('webapp e2e', () => {
  test('signup', async () => {
    const raw = await curlFetch('/api/auth/sign-up/email', {
        body: JSON.stringify({ email: testEmail, name: 'E2E Test', password: testPassword }),
        method: 'POST'
      }),
      data = JSON.parse(raw) as { user?: { email?: string } }
    expect(data.user?.email).toBe(testEmail)
  })
  test('session is valid', async () => {
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
          '3',
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
  test('events SSE emits data during chat', async () => {
    const eventProc = spawn(['curl', '-sN', '-b', COOKIE_JAR, '--max-time', '15', `${WEB_URL}/api/events`], {
      stderr: 'pipe',
      stdout: 'pipe'
    })
    await new Promise<void>(resolve => {
      setTimeout(resolve, 2000)
    })
    await curlFetch('/api/chat', {
      body: JSON.stringify({
        messages: [{ parts: [{ text: 'Say only: ping', type: 'text' }], role: 'user' }],
        sessionKey: `agent:main:e2e-events-${Date.now()}`
      }),
      method: 'POST'
    })
    await new Promise<void>(resolve => {
      setTimeout(resolve, 3000)
    })
    eventProc.kill()
    const eventOutput = await new Response(eventProc.stdout).text()
    expect(eventOutput.length).toBeGreaterThan(0)
    expect(eventOutput).toContain('data:')
  }, 30_000)
  test('chat returns agent response', async () => {
    const raw = await curlFetch('/api/chat', {
      body: JSON.stringify({
        messages: [{ parts: [{ text: 'Say only: pong', type: 'text' }], role: 'user' }],
        sessionKey: `agent:main:e2e-chat-${Date.now()}`
      }),
      method: 'POST'
    })
    expect(raw.length).toBeGreaterThan(0)
  }, 60_000)
  test('sessions list includes the chat session', async () => {
    const raw = await curlFetch('/api/sessions'),
      sessions = JSON.parse(raw) as { firstMessage: string; sessionId: string }[]
    expect(sessions.length).toBeGreaterThan(0)
  })
  test('session messages are loadable', async () => {
    const sessionsRaw = await curlFetch('/api/sessions'),
      sessions = JSON.parse(sessionsRaw) as { firstMessage: string; sessionId: string }[]
    expect(sessions.length).toBeGreaterThan(0)
    const target = sessions[0],
      msgRaw = await curlFetch(`/api/sessions/${target.sessionId}/messages`),
      messages = JSON.parse(msgRaw) as { content: string; role: string }[]
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.some(m => m.role === 'assistant')).toBe(true)
  })
  test('unauthenticated requests rejected', async () => {
    const status = await curlStatus('/api/sessions', { noCookies: true })
    expect(status).toBe(401)
  })
})
