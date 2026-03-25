/** biome-ignore-all lint/style/noProcessEnv: env config */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from 'bun:test'
import { connectWithApproval } from './connect-with-approval'
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? '18789'),
  GATEWAY_PASSWORD = process.env.GATEWAY_PASSWORD ?? 'uniclaw-dev'
describe('gateway protocol', () => {
  it('receives connect.challenge', async () => {
    const ws = new WebSocket(`ws://localhost:${String(GATEWAY_PORT)}`),
      challenge = await new Promise<Record<string, unknown>>(resolve => {
        ws.addEventListener('message', e => {
          resolve(JSON.parse(String(e.data)) as Record<string, unknown>)
        })
      })
    expect(challenge).toHaveProperty('type', 'event')
    expect(challenge).toHaveProperty('event', 'connect.challenge')
    ws.close()
  })
  it('connects with password + device identity', async () => {
    const conn = await connectWithApproval({ password: GATEWAY_PASSWORD, port: GATEWAY_PORT })
    expect(conn.ws.readyState).toBe(WebSocket.OPEN)
    conn.close()
  })
})
