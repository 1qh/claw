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
  it('connects and receives welcome', async () => {
    const ws = new WebSocket(`ws://localhost:${String(port)}/ws`),
      messages: unknown[] = [],
      connected = new Promise<void>(resolve => {
        ws.addEventListener('message', e => {
          messages.push(JSON.parse(String(e.data)))
          resolve()
        })
      })
    await connected
    expect(messages[0]).toEqual({ type: 'connected' })
    ws.close()
  })
  it('echoes messages', async () => {
    const ws = new WebSocket(`ws://localhost:${String(port)}/ws`)
    await new Promise<void>(resolve => {
      ws.addEventListener('open', () => {
        resolve()
      })
    })
    const echo = new Promise<unknown>(resolve => {
      let first = true
      ws.addEventListener('message', e => {
        if (first) {
          first = false
          return
        }
        resolve(JSON.parse(String(e.data)))
      })
    })
    ws.send(JSON.stringify({ type: 'ping' }))
    const response = await echo
    expect(response).toEqual({ type: 'ping' })
    ws.close()
  })
})
