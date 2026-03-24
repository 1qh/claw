import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { createApp } from './index'
const app = createApp()
let port: number, baseUrl: string
beforeAll(() => {
  app.listen(0)
  port = app.server?.port ?? 0
  baseUrl = `http://localhost:${String(port)}`
})
afterAll(() => {
  app.stop()
})
describe('end-to-end', () => {
  const email = `e2e-${Date.now()}@test.com`,
    password = 'E2eTestPass123!'
  let sessionCookie: string
  it('user signs up', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      body: JSON.stringify({ email, name: 'E2E User', password }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    expect(res.status).toBe(200)
    sessionCookie = res.headers.getSetCookie().join('; ')
    expect(sessionCookie.length).toBeGreaterThan(0)
  })
  it('user session is valid', async () => {
    const res = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: sessionCookie }
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveProperty('user')
  })
  it('user connects to websocket with auth', async () => {
    const ws = new WebSocket(`ws://localhost:${String(port)}/ws`, {
        headers: { cookie: sessionCookie }
      }),
      msg = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      })
    expect(msg.type).toBe('connected')
    expect(msg.userId).toBeTruthy()
    ws.close()
  })
  it('unauthenticated websocket gets error', async () => {
    const ws = new WebSocket(`ws://localhost:${String(port)}/ws`),
      msg = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      })
    expect(msg.type).toBe('error')
    ws.close()
  })
})
