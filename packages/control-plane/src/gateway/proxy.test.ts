import { describe, expect, it } from 'bun:test'
import { addToBuffer, canConnect, createEventBuffer, replayEvents, trackConnection, untrackConnection } from './proxy'
describe('event buffer', () => {
  it('stores events with sequence numbers', () => {
    const buffer = createEventBuffer()
    addToBuffer(buffer, { data: 'test1', type: 'agent' })
    addToBuffer(buffer, { data: 'test2', type: 'chat' })
    expect(buffer.events).toHaveLength(2)
    expect(buffer.seq).toBe(2)
    expect(buffer.events[0]?.seq).toBe(1)
    expect(buffer.events[1]?.seq).toBe(2)
  })
  it('evicts oldest when max size reached', () => {
    const buffer = createEventBuffer()
    buffer.maxSize = 3
    for (let i = 0; i < 5; i += 1) addToBuffer(buffer, { i })
    expect(buffer.events).toHaveLength(3)
    expect(buffer.events[0]?.seq).toBe(3)
    expect(buffer.seq).toBe(5)
  })
  it('replays missed events', () => {
    const buffer = createEventBuffer()
    for (let i = 0; i < 5; i += 1) addToBuffer(buffer, { i })
    const missed = replayEvents(buffer, 3)
    expect(missed).toHaveLength(2)
    expect(missed[0]?.seq).toBe(4)
    expect(missed[1]?.seq).toBe(5)
  })
})
describe('connection tracking', () => {
  it('allows up to max connections', () => {
    const userId = `test-user-${Date.now()}`
    expect(canConnect(userId)).toBe(true)
    trackConnection(userId)
    expect(canConnect(userId)).toBe(true)
    trackConnection(userId)
    expect(canConnect(userId)).toBe(false)
    untrackConnection(userId)
    expect(canConnect(userId)).toBe(true)
    untrackConnection(userId)
    expect(canConnect(userId)).toBe(true)
  })
})
