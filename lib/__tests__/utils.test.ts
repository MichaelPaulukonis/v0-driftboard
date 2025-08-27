
import { expect, test } from 'vitest'
import { cn } from '../utils'
 
test('cn function merges class names correctly', () => {
  expect(cn('foo', 'bar')).toBe('foo bar')
  expect(cn('foo', false, 'bar')).toBe('foo bar')
  expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
})
