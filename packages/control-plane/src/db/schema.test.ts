import { afterAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '.'
import { cache, gateways } from './schema'
afterAll(async () => {
  await db.delete(cache).where(eq(cache.key, 'test-key'))
  await db.delete(gateways).where(eq(gateways.id, 'test-gw'))
})
describe('database schema', () => {
  it('inserts and reads a gateway', async () => {
    await db.insert(gateways).values({ host: 'localhost', id: 'test-gw', port: 18_789 })
    const rows = await db.select().from(gateways).where(eq(gateways.id, 'test-gw'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.host).toBe('localhost')
  })
  it('inserts and reads cache with TTL', async () => {
    const future = new Date(Date.now() + 3_600_000)
    await db.insert(cache).values({ key: 'test-key', ttl: future, value: { rate: 1.08 } })
    const rows = await db.select().from(cache).where(eq(cache.key, 'test-key'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.value).toEqual({ rate: 1.08 })
  })
})
