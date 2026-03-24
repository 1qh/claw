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
describe('auth', () => {
  const email = `test-${Date.now()}@example.com`,
    password = 'TestPassword123!'
  let sessionCookie: string
  it('signs up a new user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      body: JSON.stringify({ email, name: 'Test User', password }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.length).toBeGreaterThan(0)
    sessionCookie = cookies.join('; ')
  })
  it('validates session', async () => {
    const res = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: sessionCookie }
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveProperty('user')
  })
  it('returns null session for unauthenticated request', async () => {
    const res = await fetch(`${baseUrl}/api/auth/get-session`)
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
  it('logs in with email and password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      body: JSON.stringify({ email, password }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    expect(res.status).toBe(200)
    const cookies = res.headers.getSetCookie()
    expect(cookies.length).toBeGreaterThan(0)
  })
  it('logs out', async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-out`, {
      headers: { cookie: sessionCookie },
      method: 'POST'
    })
    expect(res.status).toBe(200)
  })
})
