import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { createApp } from './index'
const app = createApp()
let port: number
beforeAll(() => {
  app.listen(0)
  port = app.server?.port ?? 0
})
afterAll(() => {
  app.stop()
})
describe('health endpoint', () => {
  it('returns ok', async () => {
    const res = await fetch(`http://localhost:${String(port)}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, status: 'live' })
  })
})
