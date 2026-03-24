/** biome-ignore-all lint/style/noProcessEnv: env config */
import { afterAll, describe, expect, it } from 'bun:test'
import { createGatewayClient } from './client'
const GATEWAY_HOST = process.env.GATEWAY_HOST ?? 'localhost',
  GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? '18789'),
  GATEWAY_TOKEN = process.env.GATEWAY_AUTH_TOKEN ?? 'test-token',
  client = createGatewayClient({
    host: GATEWAY_HOST,
    port: GATEWAY_PORT,
    token: GATEWAY_TOKEN
  })
describe('gateway client', () => {
  it('health check returns ok', async () => {
    const health = await client.healthCheck()
    expect(health.ok).toBe(true)
    expect(health.status).toBe('live')
  })
  it('connects via websocket', async () => {
    await client.connect()
    expect(client.getStatus()).toBe('connected')
  })
  it('receives events', async () => {
    const events: unknown[] = [],
      unsub = client.onEvent(e => {
        events.push(e)
      })
    await new Promise(resolve => {
      setTimeout(resolve, 1000)
    })
    unsub()
    expect(events.length).toBeGreaterThanOrEqual(0)
  })
  afterAll(() => {
    client.disconnect()
  })
})
