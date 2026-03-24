import { expect, test } from 'bun:test'
import { UNICLAW_REACT_VERSION } from './index'
test('version is defined', () => {
  expect(UNICLAW_REACT_VERSION).toBe('0.0.0')
})
