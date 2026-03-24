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
describe('health endpoint', () => {
  it('returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, status: 'live' })
  })
  it('has security headers', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('strict-transport-security')).toContain('max-age=')
  })
  it('has CORS headers', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { origin: 'http://localhost:3001' }
    })
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
describe('websocket', () => {
  it('rejects unauthenticated connection with error', async () => {
    const ws = new WebSocket(`ws://localhost:${String(port)}/ws`),
      msg = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      })
    expect(msg.type).toBe('error')
    expect(msg.error).toBe('authentication required')
    ws.close()
  })
})
