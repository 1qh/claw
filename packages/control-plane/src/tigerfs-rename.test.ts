/** biome-ignore-all lint/performance/noAwaitInLoops: sequential by design */
/* eslint-disable no-await-in-loop */
/* oxlint-disable no-await-in-loop */
import { env } from '@a/env'
import { spawn } from 'bun'
import { describe, expect, test } from 'bun:test'
const GATEWAY_URL = `http://localhost:${env.GATEWAY_PORT}`,
  chat = async (content: string) => {
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      body: JSON.stringify({
        messages: [{ content, role: 'user' }],
        model: `ollama/${env.OPENCLAW_MODEL}`,
        stream: false
      }),
      headers: { authorization: `Bearer ${env.GATEWAY_PASSWORD}`, 'content-type': 'application/json' },
      method: 'POST'
    })
    return res.json() as Promise<{
      choices?: { message?: { content?: string } }[]
      error?: { message: string }
    }>
  },
  sql = async (query: string) => {
    const proc = spawn(['docker', 'exec', env.TIMESCALEDB_CONTAINER, 'psql', '-U', 'uniclaw', '-t', '-c', query], {
        stderr: 'pipe',
        stdout: 'pipe'
      }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return out.trim()
  },
  gatewayLog = async () => {
    const proc = spawn(['docker', 'exec', env.GATEWAY_CONTAINER, 'sh', '-c', 'cat /tmp/openclaw/openclaw-*.log'], {
        stderr: 'pipe',
        stdout: 'pipe'
      }),
      out = await new Response(proc.stdout).text()
    await proc.exited
    return out
  }
describe('TigerFS rename shim', () => {
  test('sequential messages — sessions.json survives repeated rename-over-existing', async () => {
    const results: boolean[] = []
    for (let i = 1; i <= 5; i += 1) {
      const res = await chat(`Reply with only the number ${String(i)}`)
      results.push(!res.error)
    }
    expect(results.every(Boolean)).toBe(true)
  }, 120_000)
  test('concurrent messages — no EIO under parallel rename pressure', async () => {
    const promises = Array.from({ length: 5 }, async (_, i) => chat(`Reply only: ${String(i + 1)}`)),
      results = await Promise.all(promises)
    for (const res of results) expect(res.error).toBeUndefined()
  }, 120_000)
  test('session transcripts stored in TimescaleDB via TigerFS', async () => {
    const count = await sql("SELECT COUNT(*) FROM _state WHERE filename LIKE 'agents/main/sessions/%.jsonl';")
    expect(Number(count)).toBeGreaterThan(0)
  })
  test('sessions.json exists and is non-empty in TimescaleDB', async () => {
    const size = await sql("SELECT length(body) FROM _state WHERE filename = 'agents/main/sessions/sessions.json';")
    expect(Number(size)).toBeGreaterThan(10)
  })
  test('version history tracks sessions.json updates', async () => {
    const count = await sql(
      "SELECT COUNT(*) FROM _state_history WHERE filename LIKE 'agents/main/sessions/sessions.json%';"
    )
    expect(Number(count)).toBeGreaterThan(1)
  })
  test('no EIO errors in gateway log', async () => {
    const log = await gatewayLog(),
      eioCount = (log.match(/EIO/gu) ?? []).length
    expect(eioCount).toBe(0)
  })
})
